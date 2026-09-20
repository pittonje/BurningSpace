import { request as httpRequest, type OutgoingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomBytes } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeAdmissionAddress } from '../src/security/admissionPeerIdentity.js';
import { requireRollout } from './persistent-rollout-contract.js';

export type Phase = 'a-exhaust' | 'b-isolation' | 'a-spoof' | 'local-proof';
export interface AdmissionConfig {
  runId: string; targetCommit: string; environmentId: string; topologyId: string; edgeConfigId: string;
  serverOrigin: string; allowedOrigin: string; sourceAddress: string; nodePeer: string;
}
export interface AdmissionEvidence extends AdmissionConfig {
  formatVersion: 1; phase: Phase; startedAt: number; completedAt: number;
  statuses: number[]; zeroGuestBodies: true; freshAuth: 'INCONCLUSIVE';
}
const CONFIG_KEYS = ['runId', 'targetCommit', 'environmentId', 'topologyId', 'edgeConfigId', 'serverOrigin', 'allowedOrigin', 'sourceAddress', 'nodePeer'];
function exactKeys(value: object, keys: string[]): void {
  requireRollout(Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'EVIDENCE_FIELDS');
}
export function admissionKey(address: string): string {
  const canonical = canonicalizeAdmissionAddress(address);
  requireRollout(canonical, 'SOURCE_ADDRESS'); return canonical.budget;
}
export function validateAdmissionConfig(c: AdmissionConfig, local = false): void {
  exactKeys(c, CONFIG_KEYS);
  requireRollout(/^[a-f0-9]{32}$/u.test(c.runId) && /^[a-f0-9]{40}$/u.test(c.targetCommit), 'EVIDENCE_ID');
  for (const id of [c.environmentId, c.topologyId, c.edgeConfigId]) requireRollout(typeof id === 'string' && /^[a-zA-Z0-9._-]{3,100}$/u.test(id), 'EVIDENCE_BINDING');
  for (const origin of [c.serverOrigin, c.allowedOrigin]) {
    const url = new URL(origin);
    requireRollout(url.origin === origin && !url.username && !url.password &&
      (url.protocol === 'https:' || (local && origin === c.serverOrigin && url.protocol === 'http:' && url.hostname === '127.0.0.1')), 'EVIDENCE_ORIGIN');
  }
  if (local) requireRollout(new URL(c.serverOrigin).hostname === '127.0.0.1' && new URL(c.serverOrigin).protocol === 'http:', 'LOCAL_ONLY');
  admissionKey(c.sourceAddress); admissionKey(c.nodePeer);
}
export interface ProbeResponse { status: number; error: string; }
export type GuestProbe = (origin: string, allowed: string, headers: OutgoingHttpHeaders) => Promise<ProbeResponse>;
/** One request, no retries, no redirects, invalid body only, hard response/deadline caps. */
export const probeGuest: GuestProbe = (origin, allowed, headers) => new Promise((done, reject) => {
  const url = new URL('/identity/guest', origin);
  const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
    method: 'POST', headers: { Origin: allowed, 'Content-Type': 'application/json', 'Content-Length': '2', ...headers }
  }, response => {
    let content = '';
    response.on('data', chunk => { content += String(chunk); if (Buffer.byteLength(content) > 512) request.destroy(new Error('PROBE_SIZE')); });
    response.on('end', () => {
      clearTimeout(timer);
      try {
        const value = JSON.parse(content);
        requireRollout(value.ok === false && Object.keys(value).sort().join(',') === 'error,ok', 'PROBE_BODY');
        done({ status: response.statusCode ?? 0, error: value.error });
      } catch { reject(new Error('PROBE_RESPONSE')); }
    });
    response.on('error', () => { clearTimeout(timer); reject(new Error('PROBE_RESPONSE')); });
  });
  const timer = setTimeout(() => request.destroy(new Error('PROBE_DEADLINE')), 1500);
  request.on('error', () => { clearTimeout(timer); reject(new Error('PROBE_NETWORK')); });
  request.end('{}');
});

export async function runAdmissionPhase(config: AdmissionConfig, phase: Phase, proof?: string, probe: GuestProbe = probeGuest, now = Date.now): Promise<AdmissionEvidence> {
  validateAdmissionConfig(config, phase === 'local-proof');
  const startedAt = now(); const statuses: number[] = [];
  const attempt = async (expected: number, headers: OutgoingHttpHeaders = {}) => {
    requireRollout(now() - startedAt < 12_000 && statuses.length < 8, 'PROBE_CAP');
    const response = await probe(config.serverOrigin, config.allowedOrigin, headers);
    requireRollout(response.status === expected && response.error === (expected === 400 ? 'invalid_request' : 'rate_limited'), 'PROBE_INCONCLUSIVE');
    statuses.push(response.status);
  };
  if (phase === 'a-exhaust') { for (let i = 0; i < 3; i++) await attempt(400); await attempt(429); }
  else if (phase === 'b-isolation') await attempt(400);
  else if (phase === 'a-spoof') {
    await attempt(429);
    await attempt(429, { 'X-Forwarded-For': '198.51.100.201' });
    await attempt(429, { 'X-Real-IP': '198.51.100.202' });
    await attempt(429, { Forwarded: 'for=198.51.100.203' });
    await attempt(429, { 'X-BurningSpace-Edge-Peer': ['198.51.100.204', '198.51.100.205'], 'X-BurningSpace-Edge-Proof': ['invalid', 'invalid'] });
  } else if (phase === 'local-proof') {
    requireRollout(proof && /^[A-Za-z0-9_-]{43}$/u.test(proof) && Buffer.from(proof, 'base64url').toString('base64url') === proof, 'PRIVATE_PROOF');
    let wrong = randomBytes(32).toString('base64url'); if (wrong === proof) wrong = randomBytes(32).toString('base64url');
    const peer = { 'X-BurningSpace-Edge-Peer': config.sourceAddress };
    await attempt(429, peer);
    await attempt(429, { ...peer, 'X-BurningSpace-Edge-Proof': 'malformed' });
    await attempt(429, { ...peer, 'X-BurningSpace-Edge-Proof': wrong });
    await attempt(429, { ...peer, 'X-BurningSpace-Edge-Proof': [wrong, wrong] });
    for (let i = 0; i < 3; i++) await attempt(400, { ...peer, 'X-BurningSpace-Edge-Proof': proof });
    await attempt(429, { ...peer, 'X-BurningSpace-Edge-Proof': proof });
  } else requireRollout(false, 'PHASE');
  requireRollout(now() - startedAt <= 12_000, 'PROBE_CAP');
  return { ...config, formatVersion: 1, phase, startedAt, completedAt: now(), statuses, zeroGuestBodies: true, freshAuth: 'INCONCLUSIVE' };
}

const EXPECTED: Record<Phase, number[]> = { 'a-exhaust': [400,400,400,429], 'b-isolation': [400], 'a-spoof': [429,429,429,429,429], 'local-proof': [429,429,429,429,400,400,400,429] };
function validateEvidence(e: AdmissionEvidence): void {
  exactKeys(e, [...CONFIG_KEYS, 'formatVersion', 'phase', 'startedAt', 'completedAt', 'statuses', 'zeroGuestBodies', 'freshAuth']);
  validateAdmissionConfig(Object.fromEntries(CONFIG_KEYS.map(k => [k, (e as any)[k]])) as unknown as AdmissionConfig, e.phase === 'local-proof');
  requireRollout(e.formatVersion === 1 && e.zeroGuestBodies === true && e.freshAuth === 'INCONCLUSIVE' && Object.hasOwn(EXPECTED, e.phase) &&
    JSON.stringify(e.statuses) === JSON.stringify(EXPECTED[e.phase]) && Number.isSafeInteger(e.startedAt) && Number.isSafeInteger(e.completedAt) &&
    e.startedAt > 0 && e.completedAt >= e.startedAt && e.completedAt - e.startedAt <= 12_000, 'EVIDENCE_RESULT');
}
export interface PeerObservation {
  runId: string; targetCommit: string; environmentId: string; topologyId: string; edgeConfigId: string;
  method: 'node-network-namespace-socket'; transport: 'real-caddy'; serverContainerId: string;
  observedAt: number; nodePeer: string; sourceAAddress: string; sourceBAddress: string;
  peerEvidenceReference: string; sourceEvidenceReference: string;
}
export function validateAdmissionBundle(bundle: { a: AdmissionEvidence; b: AdmissionEvidence; spoof: AdmissionEvidence; local: AdmissionEvidence; observation: PeerObservation; proofLogs: { timestamp: string; event: string; reason: string }[] }): void {
  exactKeys(bundle, ['a', 'b', 'spoof', 'local', 'observation', 'proofLogs']);
  const { a, b, spoof, local, observation: o } = bundle;
  for (const e of [a,b,spoof,local]) validateEvidence(e);
  requireRollout(a.phase === 'a-exhaust' && b.phase === 'b-isolation' && spoof.phase === 'a-spoof' && local.phase === 'local-proof', 'EVIDENCE_PHASE');
  exactKeys(o, ['runId', 'targetCommit', 'environmentId', 'topologyId', 'edgeConfigId', 'method', 'transport', 'serverContainerId', 'observedAt', 'nodePeer', 'sourceAAddress', 'sourceBAddress', 'peerEvidenceReference', 'sourceEvidenceReference']);
  for (const key of ['runId', 'targetCommit', 'environmentId', 'topologyId', 'edgeConfigId', 'nodePeer'] as const) requireRollout([b,spoof,local,o].every(e => e[key] === a[key]), 'EVIDENCE_CORRELATION');
  requireRollout(a.serverOrigin === b.serverOrigin && a.serverOrigin === spoof.serverOrigin && [b,spoof,local].every(e => e.allowedOrigin === a.allowedOrigin), 'EVIDENCE_ORIGIN');
  requireRollout(a.sourceAddress === spoof.sourceAddress && a.sourceAddress === o.sourceAAddress && b.sourceAddress === o.sourceBAddress && admissionKey(a.sourceAddress) !== admissionKey(b.sourceAddress), 'DISTINCT_KEYS');
  requireRollout([a, b].every(e => admissionKey(e.sourceAddress) !== admissionKey(local.sourceAddress)), 'LOCAL_DISTINCT_KEY');
  requireRollout(a.completedAt <= b.startedAt && b.completedAt <= spoof.startedAt && spoof.completedAt - a.startedAt <= 20_000, 'INCONCLUSIVE_TIMING');
  requireRollout(o.method === 'node-network-namespace-socket' && o.transport === 'real-caddy' && /^[a-f0-9]{64}$/u.test(o.serverContainerId) &&
    Number.isSafeInteger(o.observedAt) && Math.abs(o.observedAt - a.startedAt) <= 600_000 && Math.abs(local.startedAt - a.startedAt) <= 600_000, 'PEER_MEASUREMENT');
  for (const ref of [o.peerEvidenceReference, o.sourceEvidenceReference]) requireRollout(/^[a-zA-Z0-9._/-]{3,160}$/u.test(ref), 'MEASUREMENT_REFERENCE');
  requireRollout(Array.isArray(bundle.proofLogs) && bundle.proofLogs.length >= 3 && bundle.proofLogs.length <= 12, 'PROOF_LOGS');
  const reasons = new Set<string>();
  for (const log of bundle.proofLogs) {
    exactKeys(log, ['timestamp', 'event', 'reason']);
    const time = Date.parse(log.timestamp);
    requireRollout(log.event === 'admission_trusted_edge_assertion_rejected' && ['edge_proof_missing','edge_proof_malformed','edge_proof_rejected'].includes(log.reason) &&
      time >= local.startedAt - 1000 && time <= local.completedAt + 1000, 'PROOF_LOG_CORRELATION');
    reasons.add(log.reason);
  }
  requireRollout(reasons.size === 3, 'PROOF_LOG_CORRELATION');
}

function readJson(path: string): any { requireRollout(lstatSync(path).size <= 16384, 'INPUT_SIZE'); return JSON.parse(readFileSync(path, 'utf8')); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(async () => {
    const [phase, configPath, proofPath, ...extra] = process.argv.slice(2);
    requireRollout(configPath && extra.length === 0, 'ARGUMENTS');
    if (phase === 'validate') { requireRollout(!proofPath, 'ARGUMENTS'); validateAdmissionBundle(readJson(configPath)); console.log(JSON.stringify({ ok: true, event: 'rollout_evidence_consistent', deploymentAuthorized: false, freshAuth: 'INCONCLUSIVE' })); return; }
    requireRollout(phase && Object.hasOwn(EXPECTED, phase), 'PHASE');
    let proof: string | undefined;
    if (phase === 'local-proof') {
      requireRollout(proofPath, 'PRIVATE_PROOF_FILE');
      const stat = lstatSync(proofPath); requireRollout(stat.isFile() && !stat.isSymbolicLink() && stat.size === 43 && process.platform !== 'win32' && (stat.mode & 0o077) === 0, 'PRIVATE_PROOF_FILE');
      proof = readFileSync(proofPath, 'utf8');
    } else requireRollout(!proofPath, 'ARGUMENTS');
    console.log(JSON.stringify(await runAdmissionPhase(readJson(configPath), phase as Phase, proof)));
  }).catch(() => { console.error(JSON.stringify({ ok: false, event: 'rollout_admission_inconclusive', code: 'EVIDENCE_REJECTED' })); process.exitCode = 1; });
}
