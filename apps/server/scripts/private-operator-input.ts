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

export async function readPrivateFile(path: string, minBytes: number, maxBytes: number): Promise<Buffer> {
  requireRollout(Number.isSafeInteger(minBytes) && Number.isSafeInteger(maxBytes) &&
    minBytes > 0 && minBytes <= maxBytes && maxBytes <= 8192, 'PRIVATE_FILE_SIZE');
  await assertPrivateDirectory(dirname(path));
  const uid = requirePrivatePlatform(process.platform, process.getuid?.());
  const stat = await lstat(path);
  requireRollout(stat.isFile() && !stat.isSymbolicLink(), 'PRIVATE_FILE');
  // Recheck the opened file, and refuse symlink replacement between lstat/open.
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = await file.stat();
    requireRollout(opened.isFile() && opened.size >= minBytes && opened.size <= maxBytes &&
      (opened.mode & 0o077) === 0 && opened.uid === uid, 'PRIVATE_FILE');
    const buffer = Buffer.alloc(maxBytes + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (chunk.bytesRead === 0) break;
      bytesRead += chunk.bytesRead;
    }
    requireRollout(bytesRead >= minBytes && bytesRead <= maxBytes, 'PRIVATE_FILE');
    return buffer.subarray(0, bytesRead);
  } finally { await file.close(); }
}

export async function readPrivateProjection(path: string): Promise<Record<string, string>> {
  const contents = (await readPrivateFile(path, 1, 8192)).toString('utf8');
  const result: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/u)) {
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('='); const key = line.slice(0, at);
    requireRollout(at > 0 && /^[A-Z_]+$/u.test(key) && !Object.hasOwn(result, key), 'PRIVATE_FIELDS');
    result[key] = line.slice(at + 1);
  }
  return result;
}
