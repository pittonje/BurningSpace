import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, stat, rm, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { admissionKey, runAdmissionPhase, validateAdmissionBundle, type AdmissionConfig, type GuestProbe } from '../../scripts/external-staging-admission-smoke.js';
import { provisionPrivateSmokeCredential, readPrivateSmokeCredential } from '../../scripts/private-smoke-credential.js';

const config: AdmissionConfig = { runId: '1'.repeat(32), targetCommit: 'a'.repeat(40), environmentId: 'staging-01', topologyId: 'final-topology-1', edgeConfigId: 'edge-01', serverOrigin: 'https://api.example.invalid', allowedOrigin: 'https://arena.example.invalid', sourceAddress: '198.51.100.11', nodePeer: '127.0.0.1' };
const response = (status: number) => ({ status, error: status === 400 ? 'invalid_request' : 'rate_limited' });
describe('bounded rollout evidence', () => {
  it('groups IPv6 by /64 and normalizes mapped IPv4', () => {
    expect(admissionKey('2001:db8:1:2::1')).toBe(admissionKey('2001:db8:1:2::ff'));
    expect(admissionKey('2001:db8:1:2::1')).not.toBe(admissionKey('2001:db8:1:3::1'));
    expect(admissionKey('::ffff:198.51.100.11')).toBe(admissionKey('198.51.100.11'));
  });
  it('caps requests and rejects ambiguity without retries', async () => {
    let calls = 0;
    await expect(runAdmissionPhase(config, 'a-exhaust', undefined, async () => { calls++; return response(429); })).rejects.toThrow();
    expect(calls).toBe(1);
    const headers: unknown[] = [];
    const evidence = await runAdmissionPhase(config, 'a-spoof', undefined, async (_u,_o,h) => { headers.push(h); return response(429); });
    expect(headers).toHaveLength(5); expect(evidence.statuses).toEqual([429,429,429,429,429]);
    expect(headers[4]).toHaveProperty('X-BurningSpace-Edge-Proof');
  });
  it('requires ordered two-key evidence, actual socket observation reference and fixed proof log correlation', async () => {
    const baseTime = Date.now();
    const phase = async (which: 'a-exhaust' | 'b-isolation' | 'a-spoof' | 'local-proof', c: AdmissionConfig, time: number) => {
      let calls = 0;
      const proof = randomBytes(32).toString('base64url');
      const probe: GuestProbe = async () => response(which === 'a-exhaust' ? ++calls <= 3 ? 400 : 429 : which === 'b-isolation' ? 400 : which === 'local-proof' ? ++calls >= 5 && calls <= 7 ? 400 : 429 : 429);
      const evidence = await runAdmissionPhase(c, which, proof, probe, () => time);
      expect(JSON.stringify(evidence)).not.toContain(proof); return evidence;
    };
    const a = await phase('a-exhaust', config, baseTime);
    const b = await phase('b-isolation', { ...config, sourceAddress: '198.51.100.22' }, baseTime + 1000);
    const spoof = await phase('a-spoof', config, baseTime + 2000);
    const local = await phase('local-proof', { ...config, sourceAddress: '198.51.100.254', serverOrigin: 'http://127.0.0.1:2567' }, baseTime + 3000);
    const bundle = { a,b,spoof,local, observation: { runId: config.runId, targetCommit: config.targetCommit, environmentId: config.environmentId, topologyId: config.topologyId, edgeConfigId: config.edgeConfigId, method: 'node-network-namespace-socket' as const, transport: 'real-caddy' as const, serverContainerId: 'b'.repeat(64), observedAt: baseTime, nodePeer: config.nodePeer, sourceAAddress: a.sourceAddress, sourceBAddress: b.sourceAddress, peerEvidenceReference: 'peer-observation-01', sourceEvidenceReference: 'caddy-sources-01' }, proofLogs: ['edge_proof_missing','edge_proof_malformed','edge_proof_rejected'].map(reason => ({ timestamp: new Date(local.startedAt).toISOString(), event: 'admission_trusted_edge_assertion_rejected', reason })) };
    expect(() => validateAdmissionBundle(bundle)).not.toThrow();
    for (const mutate of [
      (x: any) => { x.b.sourceAddress = x.a.sourceAddress; x.observation.sourceBAddress = x.a.sourceAddress; },
      (x: any) => { x.spoof.startedAt += 60_000; x.spoof.completedAt += 60_000; },
      (x: any) => { x.proofLogs = []; }, (x: any) => { x.observation.method = 'docker-subnet'; },
      (x: any) => { x.local.statuses[4] = 429; }, (x: any) => { x.proofLogs[0].secret = 'not-evidence'; }
    ]) { const changed = structuredClone(bundle); mutate(changed); expect(() => validateAdmissionBundle(changed)).toThrow(); }
  });
});

it.skipIf(process.platform === 'win32')('creates a private smoke file before issuance and refuses overwrite, symlinks and broad permissions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bs-smoke-private-'));
  const path = join(dir, 'retained.credential'); const credential = `bsc1_${randomBytes(32).toString('base64url')}`;
  let issues = 0;
  try {
    await provisionPrivateSmokeCredential(path, async () => {
      issues++; expect((await stat(path)).mode & 0o777).toBe(0o600); expect(await readFile(path, 'utf8')).toBe(''); return credential;
    });
    expect(await readPrivateSmokeCredential(path)).toBe(credential);
    await expect(provisionPrivateSmokeCredential(path, async () => { issues++; return credential; })).rejects.toThrow(); expect(issues).toBe(1);
    await symlink(path, join(dir, 'linked.credential'));
    await expect(readPrivateSmokeCredential(join(dir, 'linked.credential'))).rejects.toThrow();
    await chmod(path, 0o644); await expect(readPrivateSmokeCredential(path)).rejects.toThrow();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
