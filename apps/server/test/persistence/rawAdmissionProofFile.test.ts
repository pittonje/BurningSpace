import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPrivateAdmissionProof } from '../../scripts/external-staging-admission-smoke.js';

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, open: vi.fn(actual.open), lstat: vi.fn(actual.lstat) };
});
const nativeFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
beforeEach(() => {
  vi.mocked(fs.open).mockReset().mockImplementation(nativeFs.open);
  vi.mocked(fs.lstat).mockReset().mockImplementation(nativeFs.lstat);
});
afterEach(() => { vi.restoreAllMocks(); });

it.each(['win32', 'missing-uid'])('raw proof reader fails closed on unsupported private platform: %s', async kind => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
  const uid = Object.getOwnPropertyDescriptor(process, 'getuid');
  try {
    Object.defineProperty(process, 'platform', { ...platform, value: kind === 'win32' ? 'win32' : 'linux' });
    // Supply a valid UID for win32 so that case isolates the platform guard.
    Object.defineProperty(process, 'getuid', { configurable: true, value: kind === 'win32' ? () => 1234 : undefined });
    await expect(readPrivateAdmissionProof('/not-read/synthetic-proof')).rejects.toMatchObject({ code: 'PRIVATE_PROOF_FILE' });
    expect(fs.lstat).not.toHaveBeenCalled(); expect(fs.open).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(process, 'platform', platform);
    if (uid) Object.defineProperty(process, 'getuid', uid); else Reflect.deleteProperty(process, 'getuid');
  }
});

describe.skipIf(process.platform === 'win32')('raw admission proof file on POSIX', () => {
  const posixProcess = process as NodeJS.Process & { getuid: () => number };
  let dir: string; let path: string; let proof: string;
  beforeEach(async () => {
    dir = await nativeFs.mkdtemp(join(tmpdir(), 'bs-raw-proof-'));
    path = join(dir, 'proof'); proof = randomBytes(32).toString('base64url');
    await nativeFs.writeFile(path, proof, { mode: 0o600 });
  });
  afterEach(async () => { await nativeFs.rm(dir, { recursive: true, force: true }); });
  const rejected = (file: string, code = 'PRIVATE_PROOF_FILE') => expect(readPrivateAdmissionProof(file)).rejects.toMatchObject({ code });

  it('returns the exact canonical proof internally from a private invoking-UID file without logging it', async () => {
    const log = vi.spyOn(console, 'log'); const error = vi.spyOn(console, 'error');
    expect((await nativeFs.stat(dir)).mode & 0o777).toBe(0o700);
    expect((await nativeFs.stat(path)).mode & 0o777).toBe(0o600);
    expect(await readPrivateAdmissionProof(path)).toBe(proof);
    expect(fs.open).toHaveBeenCalledWith(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  });
  it('rejects a 0755 parent before opening the proof', async () => {
    await nativeFs.chmod(dir, 0o755); await rejected(path); expect(fs.open).not.toHaveBeenCalled();
  });
  it('rejects a symlinked immediate parent before opening the proof', async () => {
    await nativeFs.symlink(dir, join(dir, 'linked-parent'));
    await rejected(join(dir, 'linked-parent', 'proof')); expect(fs.open).not.toHaveBeenCalled();
  });
  it('rejects a 0644 file through opened-descriptor validation', async () => {
    await nativeFs.chmod(path, 0o644); await rejected(path); expect(fs.open).toHaveBeenCalledOnce();
  });
  it('rejects a symlinked proof file', async () => {
    await nativeFs.symlink(path, join(dir, 'linked-proof')); await rejected(join(dir, 'linked-proof'));
  });
  it('rejects a foreign parent owner before opening the proof', async () => {
    const uid = posixProcess.getuid(); vi.spyOn(posixProcess, 'getuid').mockReturnValue(uid + 1);
    await rejected(path); expect(fs.open).not.toHaveBeenCalled();
  });
  it('rejects foreign opened-file ownership after the parent passed', async () => {
    const uid = posixProcess.getuid(); vi.spyOn(posixProcess, 'getuid').mockReturnValueOnce(uid).mockReturnValue(uid + 1);
    await rejected(path); expect(fs.open).toHaveBeenCalledOnce();
  });
  it.each([42, 44])('rejects a %i-byte proof file', async size => {
    await nativeFs.writeFile(path, 'A'.repeat(size)); await rejected(path);
  });
  it.each(['malformed', 'noncanonical'])('rejects a 43-byte %s proof through canonical format validation', async kind => {
    // Last base64url character must have zero unused bits; B decodes like A.
    const value = kind === 'malformed' ? '!'.repeat(43) : 'A'.repeat(42) + 'B';
    await nativeFs.writeFile(path, value); await rejected(path, 'PRIVATE_PROOF');
  });
  it('rechecks opened mode after safe pathname checks and never reads the rejected descriptor', async () => {
    let reads = 0;
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      expect(fs.lstat).toHaveBeenCalledWith(path);
      await nativeFs.chmod(path, 0o644);
      const file = await nativeFs.open(...args);
      vi.spyOn(file, 'read').mockImplementation(async () => { reads++; throw new Error('UNEXPECTED_READ'); });
      return file;
    });
    await rejected(path); expect(reads).toBe(0);
  });
  it('O_NOFOLLOW refuses a symlink replacement between pathname checks and open', async () => {
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      await nativeFs.rename(path, join(dir, 'original'));
      await nativeFs.symlink(join(dir, 'original'), path);
      return nativeFs.open(...args);
    });
    await rejected(path);
  });
  it('validates and reads the same fd even when the pathname is replaced after open', async () => {
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      const file = await nativeFs.open(...args);
      await nativeFs.rename(path, join(dir, 'original'));
      await nativeFs.writeFile(path, randomBytes(32).toString('base64url'), { mode: 0o600 });
      return file;
    });
    expect(await readPrivateAdmissionProof(path)).toBe(proof);
    expect(fs.open).toHaveBeenCalledOnce();
  });
  it.each([42, 44])('rejects %i actual bytes when file length changes after fstat', async size => {
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      const file = await nativeFs.open(...args); const stat = file.stat.bind(file);
      vi.spyOn(file, 'stat').mockImplementationOnce(async () => {
        const checked = await stat();
        await nativeFs.writeFile(path, 'A'.repeat(size));
        return checked;
      });
      return file;
    });
    await rejected(path);
  });
  it('redacts underlying filesystem errors even if they contain a synthetic secret canary', async () => {
    vi.mocked(fs.open).mockRejectedValueOnce(new Error(proof));
    await expect(readPrivateAdmissionProof(path)).rejects.toMatchObject({ message: 'Persistent rollout validation failed.', code: 'PRIVATE_PROOF_FILE' });
  });
});
