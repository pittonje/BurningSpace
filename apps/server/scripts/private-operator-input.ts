import { open, lstat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { requireRollout } from './persistent-rollout-contract.js';

export function requirePrivatePlatform(platform: NodeJS.Platform, uid: number | undefined): number {
  requireRollout(platform !== 'win32' && Number.isSafeInteger(uid) && uid! >= 0, 'PRIVATE_PLATFORM');
  return uid!;
}

export async function assertPrivateDirectory(path: string, writable = false): Promise<void> {
  const uid = requirePrivatePlatform(process.platform, process.getuid?.());
  const stat = await lstat(path);
  requireRollout(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.uid === uid, 'PRIVATE_DIRECTORY');
  if (writable) {
    requireRollout((stat.mode & 0o300) === 0o300, 'PRIVATE_DIRECTORY_WRITE');
    await access(path, constants.W_OK | constants.X_OK);
  }
}

export async function readPrivateProjection(path: string): Promise<Record<string, string>> {
  await assertPrivateDirectory(dirname(path));
  const uid = requirePrivatePlatform(process.platform, process.getuid?.());
  const stat = await lstat(path);
  requireRollout(stat.isFile() && !stat.isSymbolicLink(), 'PRIVATE_FILE');
  // Recheck the opened file, and refuse symlink replacement between lstat/open.
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let contents: string;
  try {
    const opened = await file.stat();
    requireRollout(opened.isFile() && opened.size > 0 && opened.size <= 8192 &&
      (opened.mode & 0o077) === 0 && opened.uid === uid, 'PRIVATE_FILE');
    const buffer = Buffer.alloc(8193);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    requireRollout(bytesRead > 0 && bytesRead <= 8192, 'PRIVATE_FILE');
    contents = buffer.subarray(0, bytesRead).toString('utf8');
  } finally { await file.close(); }
  const result: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/u)) {
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('='); const key = line.slice(0, at);
    requireRollout(at > 0 && /^[A-Z_]+$/u.test(key) && !Object.hasOwn(result, key), 'PRIVATE_FIELDS');
    result[key] = line.slice(at + 1);
  }
  return result;
}
