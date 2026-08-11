export const DEFAULT_SHUTDOWN_TIMEOUT_SECONDS = 15;

export interface RuntimeLifecycleEnvironment {
  readonly BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS?: string;
}

export type RuntimeLifecycleState =
  | 'starting'
  | 'ready'
  | 'draining'
  | 'stopped'
  | 'failed';

export interface ReadinessSnapshot {
  readonly status: 200 | 503;
  readonly body: Readonly<{
    ok: boolean;
    service: 'burningspace-server';
    ready: boolean;
  }>;
}

export interface OperationalLogContext {
  readonly environment: string;
  readonly port: number;
  readonly pid?: number;
  readonly now?: () => Date;
}

export type OperationalLogLevel = 'info' | 'error';
export type OperationalLogEvent =
  | 'server_starting'
  | 'server_ready'
  | 'shutdown_started'
  | 'shutdown_completed'
  | 'startup_failed'
  | 'shutdown_failed';

export interface OperationalLogDetails {
  readonly securityMode?: string;
  readonly reconnectGraceSeconds?: number;
  readonly shutdownTimeoutSeconds?: number;
  readonly signal?: 'SIGINT' | 'SIGTERM';
  readonly errorName?: string;
  readonly errorMessage?: string;
}

export type OperationalLogSink = (line: string, level: OperationalLogLevel) => void;

const READY_BODY = Object.freeze({
  ok: true,
  service: 'burningspace-server',
  ready: true
} as const);

const NOT_READY_BODY = Object.freeze({
  ok: false,
  service: 'burningspace-server',
  ready: false
} as const);

function boundedLogValue(value: string, maximumLength = 500): string {
  return value.length <= maximumLength
    ? value
    : `${value.slice(0, maximumLength - 3)}...`;
}

export function parseShutdownTimeoutSeconds(
  environment: RuntimeLifecycleEnvironment = process.env
): number {
  const rawValue = environment.BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS;

  if (rawValue === undefined) {
    return DEFAULT_SHUTDOWN_TIMEOUT_SECONDS;
  }

  if (rawValue.trim().length === 0) {
    throw new Error(
      'BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS must be an integer from 1 to 60.'
    );
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1 || value > 60) {
    throw new Error(
      'BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS must be an integer from 1 to 60.'
    );
  }

  return value;
}

export class RuntimeLifecycle {
  private currentState: RuntimeLifecycleState = 'starting';

  get state(): RuntimeLifecycleState {
    return this.currentState;
  }

  get readiness(): ReadinessSnapshot {
    return this.currentState === 'ready'
      ? { status: 200, body: READY_BODY }
      : { status: 503, body: NOT_READY_BODY };
  }

  markReady(): boolean {
    if (this.currentState !== 'starting') {
      return false;
    }

    this.currentState = 'ready';
    return true;
  }

  beginShutdown(): boolean {
    if (this.currentState !== 'starting' && this.currentState !== 'ready') {
      return false;
    }

    this.currentState = 'draining';
    return true;
  }

  completeShutdown(): boolean {
    if (this.currentState !== 'draining') {
      return false;
    }

    this.currentState = 'stopped';
    return true;
  }

  markFailed(): void {
    this.currentState = 'failed';
  }
}

export function createOperationalLogger(
  context: OperationalLogContext,
  sink: OperationalLogSink = (line, level) => {
    if (level === 'error') {
      console.error(line);
      return;
    }

    console.log(line);
  }
): (
  level: OperationalLogLevel,
  event: OperationalLogEvent,
  details?: OperationalLogDetails
) => void {
  return (level, event, details = {}) => {
    const safeDetails = { ...details };

    if (safeDetails.errorName !== undefined) {
      safeDetails.errorName = boundedLogValue(safeDetails.errorName, 100);
    }

    if (safeDetails.errorMessage !== undefined) {
      safeDetails.errorMessage = boundedLogValue(safeDetails.errorMessage);
    }

    sink(JSON.stringify({
      timestamp: (context.now ?? (() => new Date()))().toISOString(),
      level,
      event,
      service: 'burningspace-server',
      environment: context.environment,
      port: context.port,
      pid: context.pid ?? process.pid,
      ...safeDetails
    }), level);
  };
}

export function operationalErrorDetails(error: unknown): OperationalLogDetails {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message
    };
  }

  return {
    errorName: 'Error',
    errorMessage: String(error)
  };
}
