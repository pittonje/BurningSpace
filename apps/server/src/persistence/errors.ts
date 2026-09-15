export class PersistenceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceConfigError';
  }
}

export class PersistenceConnectionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PersistenceConnectionError';
  }
}

export type MigrationLedgerErrorReason =
  | 'duplicate_version'
  | 'version_gap'
  | 'missing_file'
  | 'filename_mismatch'
  | 'checksum_mismatch';

export class MigrationLedgerError extends Error {
  readonly reason: MigrationLedgerErrorReason;

  constructor(reason: MigrationLedgerErrorReason, message: string) {
    super(message);
    this.name = 'MigrationLedgerError';
    this.reason = reason;
  }
}

export class MigrationLockTimeoutError extends Error {
  readonly lockName: string;

  constructor(lockName: string, message: string) {
    super(message);
    this.name = 'MigrationLockTimeoutError';
    this.lockName = lockName;
  }
}

export class MigrationApplyError extends Error {
  readonly version: number;

  constructor(version: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MigrationApplyError';
    this.version = version;
  }
}
