import { describe, expect, test } from 'vitest';
import { PersistenceConfigError } from '../../src/persistence/errors.js';
import {
  readMigrationDatabaseUrl,
  readMigrationStatusDatabaseUrl,
  readRuntimeDatabaseUrl,
  redactDatabaseUrl,
  type PersistenceEnv
} from '../../src/persistence/config.js';

const RUNTIME_URL = 'postgres://burningspace_runtime:runtime-secret@127.0.0.1:5432/burningspace';
const MIGRATION_URL = 'postgres://burningspace_migrator:migrator-secret@127.0.0.1:5432/burningspace';

/**
 * PERSIST002-SEC-01 unit matrix: readRuntimeDatabaseUrl() must select
 * DATABASE_URL unconditionally for the running application, never falling
 * back to (or being influenced by) MIGRATION_DATABASE_URL -- the exact
 * opposite of readMigrationStatusDatabaseUrl()'s own, separately documented
 * fallback policy, which this file also pins down so the two are never
 * confused with each other.
 */
describe('readRuntimeDatabaseUrl (PERSIST002-SEC-01)', () => {
  test('runtime-only: DATABASE_URL alone is used', () => {
    expect(readRuntimeDatabaseUrl({ DATABASE_URL: RUNTIME_URL })).toBe(RUNTIME_URL);
  });

  test('both set: DATABASE_URL wins unconditionally over MIGRATION_DATABASE_URL', () => {
    expect(
      readRuntimeDatabaseUrl({ DATABASE_URL: RUNTIME_URL, MIGRATION_DATABASE_URL: MIGRATION_URL })
    ).toBe(RUNTIME_URL);
  });

  test('migration-only: MIGRATION_DATABASE_URL alone must not start the runtime', () => {
    expect(() => readRuntimeDatabaseUrl({ MIGRATION_DATABASE_URL: MIGRATION_URL })).toThrow(PersistenceConfigError);
  });

  test('missing: neither variable set fails closed', () => {
    expect(() => readRuntimeDatabaseUrl({})).toThrow(PersistenceConfigError);
  });

  test('blank: a whitespace-only DATABASE_URL is treated as absent and fails closed, even with a valid migration URL present', () => {
    expect(() =>
      readRuntimeDatabaseUrl({ DATABASE_URL: '   ', MIGRATION_DATABASE_URL: MIGRATION_URL })
    ).toThrow(PersistenceConfigError);
  });

  test('invalid runtime URL: a syntactically malformed DATABASE_URL is still returned as-is -- format validation is the connection attempt itself, not this selector', () => {
    const malformed = 'not-a-valid-connection-string';
    expect(readRuntimeDatabaseUrl({ DATABASE_URL: malformed })).toBe(malformed);
  });

  test('irrelevant invalid migration URL: a garbage MIGRATION_DATABASE_URL never breaks an otherwise-valid DATABASE_URL runtime configuration', () => {
    const env: PersistenceEnv = {
      DATABASE_URL: RUNTIME_URL,
      MIGRATION_DATABASE_URL: 'postgres://this is not even parseable :::'
    };
    expect(readRuntimeDatabaseUrl(env)).toBe(RUNTIME_URL);
  });

  test('defaults to process.env when no environment object is supplied', () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousMigrationUrl = process.env.MIGRATION_DATABASE_URL;
    try {
      process.env.DATABASE_URL = RUNTIME_URL;
      delete process.env.MIGRATION_DATABASE_URL;
      expect(readRuntimeDatabaseUrl()).toBe(RUNTIME_URL);
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
      if (previousMigrationUrl !== undefined) {
        process.env.MIGRATION_DATABASE_URL = previousMigrationUrl;
      }
    }
  });
});

describe('readMigrationStatusDatabaseUrl retains its own separate, unchanged fallback policy', () => {
  test('migration-only: MIGRATION_DATABASE_URL alone is used', () => {
    expect(readMigrationStatusDatabaseUrl({ MIGRATION_DATABASE_URL: MIGRATION_URL })).toBe(MIGRATION_URL);
  });

  test('both set: MIGRATION_DATABASE_URL takes priority (the opposite of readRuntimeDatabaseUrl)', () => {
    expect(
      readMigrationStatusDatabaseUrl({ DATABASE_URL: RUNTIME_URL, MIGRATION_DATABASE_URL: MIGRATION_URL })
    ).toBe(MIGRATION_URL);
  });

  test('runtime-only: falls back to DATABASE_URL', () => {
    expect(readMigrationStatusDatabaseUrl({ DATABASE_URL: RUNTIME_URL })).toBe(RUNTIME_URL);
  });

  test('missing: neither variable set fails closed', () => {
    expect(() => readMigrationStatusDatabaseUrl({})).toThrow(PersistenceConfigError);
  });
});

describe('readMigrationDatabaseUrl (operator migration application, unchanged)', () => {
  test('requires MIGRATION_DATABASE_URL and never accepts DATABASE_URL as a substitute', () => {
    expect(readMigrationDatabaseUrl({ MIGRATION_DATABASE_URL: MIGRATION_URL })).toBe(MIGRATION_URL);
    expect(() => readMigrationDatabaseUrl({ DATABASE_URL: RUNTIME_URL })).toThrow(PersistenceConfigError);
  });
});

describe('redactDatabaseUrl (unchanged, still never logs a raw credential)', () => {
  test('strips userinfo from a well-formed URL', () => {
    expect(redactDatabaseUrl(RUNTIME_URL)).not.toContain('runtime-secret');
  });

  test('never returns the raw input for an unparseable value', () => {
    const raw = 'postgres://this is not even parseable :::';
    expect(redactDatabaseUrl(raw)).not.toBe(raw);
  });
});
