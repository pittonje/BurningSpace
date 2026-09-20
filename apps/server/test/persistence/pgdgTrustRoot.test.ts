import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';

const fingerprint = 'B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8';
const dockerfile = readFileSync('deploy/server.Dockerfile', 'utf8');
const layer = dockerfile.split('FROM runtime-deps AS persistence-tools')[1]!.split('COPY --from=build')[0]!;
const check = layer.split(/\r?\n/u).find(line => line.trim().startsWith('&& test '))?.trim().slice(3).replace(/ \\$/u, '');

it('keeps full primary-key fingerprint inspection before enabling signed PGDG APT', () => {
  const inspection = 'gpg --batch --show-keys --with-colons --fingerprint /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc > /tmp/pgdg-key.info';
  expect(layer).toContain(`&& ${inspection} \\`);
  expect(check).toBe(`test "$(awk -F: '$1 == "pub" { primary=1 } $1 == "sub" { primary=0 } $1 == "fpr" && primary { print $10; primary=0 }' /tmp/pgdg-key.info)" = '${fingerprint}'`);
  expect(layer.indexOf(inspection)).toBeLessThan(layer.indexOf(check!));
  expect(layer.indexOf(check!)).toBeLessThan(layer.indexOf('&& echo \'deb [signed-by='));
  expect(layer).toContain('&& apt-get purge -y --auto-remove curl gnupg');
  expect(layer).not.toMatch(/\|\|\s*(?:true|:)|--insecure|--allow-unauthenticated/u);
});

it.skipIf(process.platform === 'win32')('executes the Docker fingerprint equality guard against valid, wrong, short, empty and multiple-key output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bs-pgdg-pin-')); const path = join(dir, 'key.info');
  const key = (value: string) => `pub:::::::::\nfpr:::::::::${value}:\n`;
  try {
    for (const [text, accepted] of [
      [key(fingerprint), true], [key('0'.repeat(40)), false], [key('ACCC4CF8'), false], ['', false],
      [key(fingerprint) + key(fingerprint), false],
      [key(fingerprint) + 'sub:::::::::\nfpr:::::::::SUBKEY:\n', true]
    ] as const) {
      writeFileSync(path, text);
      const result = spawnSync('sh', ['-c', check!.replace('/tmp/pgdg-key.info', '"$1"'), 'pgdg-pin-test', path]);
      expect(result.error).toBeUndefined(); expect(result.status === 0).toBe(accepted);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
