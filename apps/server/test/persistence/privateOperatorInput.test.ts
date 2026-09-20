import { mkdtemp, writeFile, mkdir, chmod, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { assertPrivateDirectory, readPrivateProjection, requirePrivatePlatform } from '../../scripts/private-operator-input.js';
import { runOperation } from '../../scripts/persistence-operator.js';

it('fails closed for native Windows and missing POSIX identity on any test host', () => {
  expect(requirePrivatePlatform('linux', 1234)).toBe(1234);
  expect(() => requirePrivatePlatform('win32', 1234)).toThrow(expect.objectContaining({ code: 'PRIVATE_PLATFORM' }));
  expect(() => requirePrivatePlatform('linux', undefined)).toThrow(expect.objectContaining({ code: 'PRIVATE_PLATFORM' }));
});

it.each(['constructor', '__proto__', 'toString', 'unknown'])('rejects operation %s before filesystem or DB access', async operation => {
  await expect(runOperation(operation)).rejects.toMatchObject({ code: 'OPERATION' });
});

describe.skipIf(process.platform === 'win32')('POSIX private operator inputs', () => {
  it('accepts invoking-user private files, rejects file/directory permissions, symlinks, size and ownership', async () => {
    const root = await mkdtemp(join(tmpdir(), 'bs-private-input-'));
    const dir = join(root, 'inputs'); const path = join(dir, 'migrator.env');
    await mkdir(dir, { mode: 0o700 });
    const put = () => writeFile(path, 'VALUE=private-test-value\n', { mode: 0o600 });
    const rejected = (code: string) => expect(readPrivateProjection(path)).rejects.toMatchObject({ code });
    try {
      await put();
      expect(await readPrivateProjection(path)).toEqual({ VALUE: 'private-test-value' });
      await chmod(dir, 0o755); await rejected('PRIVATE_DIRECTORY'); await chmod(dir, 0o700);
      await chmod(path, 0o644); await rejected('PRIVATE_FILE'); await chmod(path, 0o600);
      for (const value of ['', 'x'.repeat(8193)]) { await writeFile(path, value); await rejected('PRIVATE_FILE'); }
      await put();
      await symlink(path, join(dir, 'linked.env'));
      await expect(readPrivateProjection(join(dir, 'linked.env'))).rejects.toThrow();
      await symlink(dir, join(root, 'linked-dir'));
      await expect(readPrivateProjection(join(root, 'linked-dir', 'migrator.env'))).rejects.toMatchObject({ code: 'PRIVATE_DIRECTORY' });
      await expect(assertPrivateDirectory(path)).rejects.toMatchObject({ code: 'PRIVATE_DIRECTORY' });
      await expect(readPrivateProjection(dir)).rejects.toMatchObject({ code: 'PRIVATE_FILE' });
      const uid = process.getuid!();
      const identity = vi.spyOn(process, 'getuid');
      try {
        identity.mockReturnValue(uid + 1);
        await rejected('PRIVATE_DIRECTORY');
        // Parent passes; the opened file must independently enforce invoking UID.
        identity.mockReset().mockReturnValueOnce(uid).mockReturnValue(uid + 1);
        await rejected('PRIVATE_FILE');
      } finally { identity.mockRestore(); }
      expect(await readPrivateProjection(path)).toEqual({ VALUE: 'private-test-value' });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('requires output directories to be private, owned and writable without widening permissions', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bs-private-work-'));
    try {
      await expect(assertPrivateDirectory(dir, true)).resolves.toBeUndefined();
      await chmod(dir, 0o500);
      await expect(assertPrivateDirectory(dir)).resolves.toBeUndefined();
      await expect(assertPrivateDirectory(dir, true)).rejects.toMatchObject({ code: 'PRIVATE_DIRECTORY_WRITE' });
      await chmod(dir, 0o755);
      await expect(assertPrivateDirectory(dir, true)).rejects.toMatchObject({ code: 'PRIVATE_DIRECTORY' });
    } finally { await chmod(dir, 0o700); await rm(dir, { recursive: true, force: true }); }
  });
});
