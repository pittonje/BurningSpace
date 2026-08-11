import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHUTDOWN_TIMEOUT_SECONDS,
  RuntimeLifecycle,
  parseShutdownTimeoutSeconds
} from '../src/ops/runtimeLifecycle.js';

describe('runtime lifecycle configuration', () => {
  it('uses the 15-second shutdown default', () => {
    expect(parseShutdownTimeoutSeconds({})).toBe(DEFAULT_SHUTDOWN_TIMEOUT_SECONDS);
    expect(DEFAULT_SHUTDOWN_TIMEOUT_SECONDS).toBe(15);
  });

  it.each(['1', '60'])('accepts shutdown timeout boundary %s', (value) => {
    expect(parseShutdownTimeoutSeconds({
      BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: value
    })).toBe(Number(value));
  });

  it.each(['0', '-1', '61', '1.5', '', ' ', 'NaN', 'Infinity'])(
    'rejects invalid shutdown timeout %j',
    (value) => {
      expect(() => parseShutdownTimeoutSeconds({
        BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: value
      })).toThrow(
        'BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS must be an integer from 1 to 60.'
      );
    }
  );
});

describe('runtime readiness lifecycle', () => {
  it('is not ready until explicitly marked ready', () => {
    const lifecycle = new RuntimeLifecycle();

    expect(lifecycle.state).toBe('starting');
    expect(lifecycle.readiness).toEqual({
      status: 503,
      body: { ok: false, service: 'burningspace-server', ready: false }
    });

    expect(lifecycle.markReady()).toBe(true);
    expect(lifecycle.state).toBe('ready');
    expect(lifecycle.readiness).toEqual({
      status: 200,
      body: { ok: true, service: 'burningspace-server', ready: true }
    });
  });

  it('becomes not ready before shutdown and ignores duplicate requests', () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();

    expect(lifecycle.beginShutdown()).toBe(true);
    expect(lifecycle.state).toBe('draining');
    expect(lifecycle.readiness.status).toBe(503);
    expect(lifecycle.beginShutdown()).toBe(false);
    expect(lifecycle.completeShutdown()).toBe(true);
    expect(lifecycle.state).toBe('stopped');
  });

  it('cannot return to ready after shutdown begins', () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    lifecycle.beginShutdown();

    expect(lifecycle.markReady()).toBe(false);
    expect(lifecycle.readiness.status).toBe(503);
  });
});
