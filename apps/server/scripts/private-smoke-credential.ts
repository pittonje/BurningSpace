import { open, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { requireRollout } from './persistent-rollout-contract.js';

function valid(value: string): boolean { return /^bsc1_[A-Za-z0-9_-]{43}$/u.test(value) && Buffer.from(value.slice(5), 'base64url').toString('base64url') === value.slice(5); }
async function privateParent(path: string): Promise<void> {
  // POSIX mode cannot prove Windows DACL restrictions. Fail closed on that host;
  // provision using an approved POSIX operator environment with a private parent.
  requireRollout(process.platform !== 'win32', 'PRIVATE_PLATFORM');
  const parent = await lstat(dirname(path));
  requireRollout(parent.isDirectory() && !parent.isSymbolicLink() && (parent.mode & 0o077) === 0 && parent.uid === process.getuid!(), 'PRIVATE_PARENT');
}
export async function provisionPrivateSmokeCredential(path: string, issue: () => Promise<string>): Promise<void> {
  await privateParent(path);
  const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    // Reserve BEFORE issuing: reruns/collisions cannot create another durable guest.
    const credential = await issue();
    requireRollout(valid(credential), 'PRIVATE_CREDENTIAL');
    await file.writeFile(credential, 'utf8'); await file.sync();
  } finally { await file.close(); }
  // Failures leave an explicit private empty file for operator disposition.
}
export async function readPrivateSmokeCredential(path: string): Promise<string> {
  await privateParent(path);
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    requireRollout(stat.isFile() && stat.size === 48 && (stat.mode & 0o077) === 0 && stat.uid === process.getuid!(), 'PRIVATE_CREDENTIAL_FILE');
    const value = await file.readFile('utf8'); requireRollout(valid(value), 'PRIVATE_CREDENTIAL'); return value;
  } finally { await file.close(); }
}
