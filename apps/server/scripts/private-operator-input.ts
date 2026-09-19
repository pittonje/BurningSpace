import { readFile, lstat } from 'node:fs/promises';
import { requireRollout } from './persistent-rollout-contract.js';

export async function readPrivateProjection(path: string): Promise<Record<string, string>> {
  const stat = await lstat(path);
  requireRollout(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 8192 &&
    (process.platform === 'win32' || (stat.mode & 0o077) === 0), 'PRIVATE_FILE');
  const result: Record<string, string> = {};
  for (const line of (await readFile(path, 'utf8')).split(/\r?\n/u)) {
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('='); const key = line.slice(0, at);
    requireRollout(at > 0 && /^[A-Z_]+$/u.test(key) && !Object.hasOwn(result, key), 'PRIVATE_FIELDS');
    result[key] = line.slice(at + 1);
  }
  return result;
}
