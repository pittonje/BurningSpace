import type { ClaimWorldWriterResult, WriterClaim } from './repositories/worldsRepository.js';

export const DEFAULT_BOOT_DEADLINE_MILLIS = 30_000;
export const DEFAULT_CLAIM_RETRY_INTERVAL_MILLIS = 1_000;
export const DEFAULT_HEARTBEAT_INTERVAL_MILLIS = 5_000;
export const DEFAULT_LOCAL_SAFETY_DEADLINE_MILLIS = 10_000;

export type WriterLifecycleState = 'claiming' | 'owning' | 'failed' | 'released';

export type WriterAuthorityLossReason =
  | 'claim_error'
  | 'heartbeat_error'
  | 'heartbeat_zero_rows'
  | 'connection_error'
  | 'connection_closed'
  | 'local_safety_deadline_expired';

export interface MonotonicClock {
  now(): number;
}

const defaultMonotonicClock: MonotonicClock = { now: () => performance.now() };

export interface WriterRepositoryPort {
  claimWorldWriter(worldId: string, serverInstanceId: string): Promise<ClaimWorldWriterResult>;
  renewWorldWriter(worldId: string, serverInstanceId: string, writerEpoch: bigint): Promise<Date | null>;
  releaseWorldWriter(worldId: string, serverInstanceId: string, writerEpoch: bigint): Promise<boolean>;
}

export interface WriterConnectionEvents {
  once(event: 'error', listener: (error: Error) => void): unknown;
  once(event: 'end', listener: () => void): unknown;
}

export class WriterClaimTimeoutError extends Error {
  constructor(bootDeadlineMillis: number) {
    super(`Timed out claiming world writer authority within the ${bootDeadlineMillis}ms persistence boot budget.`);
    this.name = 'WriterClaimTimeoutError';
  }
}

export class WriterLifecycleTerminalStateError extends Error {
  constructor(state: WriterLifecycleState) {
    super(`WriterLifecycle is in terminal state "${state}" and cannot claim again in this process.`);
    this.name = 'WriterLifecycleTerminalStateError';
  }
}

export interface WriterLifecycleOptions {
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly repository: WriterRepositoryPort;
  readonly connection: WriterConnectionEvents;
  readonly clock?: MonotonicClock;
  readonly bootDeadlineMillis?: number;
  readonly claimRetryIntervalMillis?: number;
  readonly heartbeatIntervalMillis?: number;
  readonly localSafetyDeadlineMillis?: number;
  readonly onAuthorityLost?: (reason: WriterAuthorityLossReason, cause?: unknown) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pure decision: a heartbeat round-trip at or beyond the local safety
 * deadline is discarded for local control-safety confirmation even if the DB
 * update itself succeeded.
 */
export function isHeartbeatWithinLocalSafetyDeadline(
  requestStartedAt: number,
  responseAt: number,
  localSafetyDeadlineMillis: number = DEFAULT_LOCAL_SAFETY_DEADLINE_MILLIS
): boolean {
  return responseAt - requestStartedAt < localSafetyDeadlineMillis;
}

/**
 * Small explicit state machine: claiming -> owning -> failed | released.
 * There is no failed -> owning path; a new process boot is required to
 * reclaim authority.
 */
export class WriterLifecycle {
  private readonly clock: MonotonicClock;
  private readonly localSafetyDeadlineMillis: number;
  private stateValue: WriterLifecycleState = 'claiming';
  private writerEpochValue: bigint | undefined;
  private writerExpiresAtValue: Date | undefined;
  private lastConfirmedHeartbeatAt: number | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private readonly serverInstanceId: string;

  constructor(private readonly options: WriterLifecycleOptions) {
    this.clock = options.clock ?? defaultMonotonicClock;
    this.localSafetyDeadlineMillis = options.localSafetyDeadlineMillis ?? DEFAULT_LOCAL_SAFETY_DEADLINE_MILLIS;
    this.serverInstanceId = options.serverInstanceId;

    this.options.connection.once('error', (error) => {
      this.fail('connection_error', error);
    });
    this.options.connection.once('end', () => {
      if (this.stateValue === 'owning' || this.stateValue === 'claiming') {
        this.fail('connection_closed');
      }
    });
  }

  get state(): WriterLifecycleState {
    return this.stateValue;
  }

  get writerEpoch(): bigint | undefined {
    return this.writerEpochValue;
  }

  get writerExpiresAt(): Date | undefined {
    return this.writerExpiresAtValue;
  }

  isControlSafe(): boolean {
    if (this.stateValue !== 'owning' || this.lastConfirmedHeartbeatAt === undefined) {
      return false;
    }
    return this.clock.now() - this.lastConfirmedHeartbeatAt < this.localSafetyDeadlineMillis;
  }

  /**
   * Bounded retry on LIVE_WRITER_CONFLICT only, cadence ~once per second,
   * using monotonic time for the overall boot deadline. Never evicts a live
   * foreign writer.
   */
  async claim(): Promise<WriterClaim> {
    if (this.stateValue === 'failed' || this.stateValue === 'released') {
      throw new WriterLifecycleTerminalStateError(this.stateValue);
    }

    const bootDeadlineMillis = this.options.bootDeadlineMillis ?? DEFAULT_BOOT_DEADLINE_MILLIS;
    const claimRetryIntervalMillis = this.options.claimRetryIntervalMillis ?? DEFAULT_CLAIM_RETRY_INTERVAL_MILLIS;
    const deadline = this.clock.now() + bootDeadlineMillis;

    for (;;) {
      let outcome: ClaimWorldWriterResult;
      try {
        outcome = await this.options.repository.claimWorldWriter(this.options.worldId, this.serverInstanceId);
      } catch (cause) {
        this.stateValue = 'failed';
        this.options.onAuthorityLost?.('claim_error', cause);
        throw cause;
      }

      if (outcome.kind === 'claimed') {
        this.writerEpochValue = outcome.claim.writerEpoch;
        this.writerExpiresAtValue = outcome.claim.writerExpiresAt;
        this.stateValue = 'owning';
        this.lastConfirmedHeartbeatAt = this.clock.now();
        return outcome.claim;
      }

      if (this.clock.now() >= deadline) {
        this.stateValue = 'failed';
        const error = new WriterClaimTimeoutError(bootDeadlineMillis);
        this.options.onAuthorityLost?.('claim_error', error);
        throw error;
      }

      await sleep(claimRetryIntervalMillis);
    }
  }

  startHeartbeat(): void {
    if (this.stateValue !== 'owning' || this.heartbeatTimer !== undefined) {
      return;
    }
    const heartbeatIntervalMillis = this.options.heartbeatIntervalMillis ?? DEFAULT_HEARTBEAT_INTERVAL_MILLIS;
    this.heartbeatTimer = setInterval(() => {
      void this.performHeartbeat();
    }, heartbeatIntervalMillis);
    this.heartbeatTimer.unref?.();
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * One heartbeat attempt. Exposed publicly (not just as the internal timer
   * callback) so tests can drive it deterministically with an injected clock
   * and a fake repository, without any real timer or sleep.
   */
  async performHeartbeat(): Promise<void> {
    if (this.stateValue !== 'owning') {
      return;
    }

    if (!this.isControlSafe()) {
      this.fail('local_safety_deadline_expired');
      return;
    }

    const requestStartedAt = this.clock.now();
    let renewedExpiresAt: Date | null;
    try {
      renewedExpiresAt = await this.options.repository.renewWorldWriter(
        this.options.worldId,
        this.serverInstanceId,
        this.writerEpochValue as bigint
      );
    } catch (cause) {
      this.fail('heartbeat_error', cause);
      return;
    }

    if (renewedExpiresAt === null) {
      this.fail('heartbeat_zero_rows');
      return;
    }

    const responseAt = this.clock.now();
    if (!isHeartbeatWithinLocalSafetyDeadline(requestStartedAt, responseAt, this.localSafetyDeadlineMillis)) {
      // DB still confirms ownership, but our own round-trip was too slow to
      // trust for local control-safety purposes: discard without updating
      // lastConfirmedHeartbeatAt. The next tick's isControlSafe() check
      // above will fail closed once the deadline is truly exceeded.
      return;
    }

    this.writerExpiresAtValue = renewedExpiresAt;
    this.lastConfirmedHeartbeatAt = responseAt;
  }

  /**
   * Idempotent: a repeat call (including after fail-stop) is harmless. The
   * conditional UPDATE naturally no-ops if this instance/epoch no longer
   * owns the writer row in the database.
   */
  async release(): Promise<boolean> {
    this.stopHeartbeat();
    if (this.stateValue === 'released') {
      return false;
    }
    const hadEpoch = this.writerEpochValue !== undefined;
    const released = hadEpoch
      ? await this.options.repository
          .releaseWorldWriter(this.options.worldId, this.serverInstanceId, this.writerEpochValue as bigint)
          .catch(() => false)
      : false;
    this.stateValue = 'released';
    return released;
  }

  private fail(reason: WriterAuthorityLossReason, cause?: unknown): void {
    if (this.stateValue === 'failed') {
      return;
    }
    this.stateValue = 'failed';
    this.stopHeartbeat();
    this.options.onAuthorityLost?.(reason, cause);
  }
}
