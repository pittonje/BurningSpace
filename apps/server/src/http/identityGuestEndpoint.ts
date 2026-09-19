import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import {
  IdentityGuestIntent,
  type GuestIdentityCreateRequest,
  type GuestIdentityCreateSuccess,
  type IdentityHttpErrorResponse
} from '@burningspace/shared';
import { CREDENTIAL_ALGORITHM, CREDENTIAL_VERSION, generateCredential } from '../persistence/credential.js';
import { withTransaction } from '../persistence/pool.js';
import { insertCredential } from '../persistence/repositories/credentialsRepository.js';
import { createPlayer } from '../persistence/repositories/playersRepository.js';
import type { AdmissionPeerIdentityResolver } from '../security/admissionPeerIdentity.js';
import { evaluateRequestOrigin, type NetworkBoundaryConfig } from '../security/networkBoundary.js';
import type { PeerRateLimiter } from '../security/peerRateLimiter.js';

const IDENTITY_GUEST_PATH = '/identity/guest';
const MAX_BODY_BYTES = 1024;
const HANDLER_TIMEOUT_MILLIS = 5_000;
const CONTENT_TYPE_PATTERN = /^application\/json(\s*;.*)?$/i;

export interface IdentityGuestOperationalLog {
  (level: 'info' | 'error', event: string, details?: Record<string, unknown>): void;
}

export interface WriterAuthoritySafe {
  isControlSafe(): boolean;
}

export interface IdentityGuestEndpointContext {
  isLifecycleReady(): boolean;
  getWriterAuthority(): WriterAuthoritySafe | undefined;
  getPool(): Pool | undefined;
  readonly networkBoundaryConfig: NetworkBoundaryConfig;
  readonly limiter: PeerRateLimiter;
  /** PERSIST002-NET-02: the single canonical admission-peer identity resolver. */
  readonly admissionPeerIdentity: AdmissionPeerIdentityResolver;
  readonly log: IdentityGuestOperationalLog;
}

export function matchesIdentityGuestPath(pathname: string): boolean {
  return pathname === IDENTITY_GUEST_PATH;
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>
): void {
  response.writeHead(status, { 'content-type': 'application/json', ...extraHeaders });
  response.end(JSON.stringify(body));
}

function corsHeadersForAllowedOrigin(normalizedOrigin: string | undefined): Record<string, string> {
  if (!normalizedOrigin) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': normalizedOrigin,
    Vary: 'Origin'
  };
}

function isValidGuestCreateRequest(body: unknown): body is GuestIdentityCreateRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return false;
  }

  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === 1 && record.intent === IdentityGuestIntent;
}

/**
 * Reads and JSON-parses the request body without ever accumulating past
 * MAX_BODY_BYTES. Resolves undefined for any invalid/oversized/empty input;
 * the caller maps that uniformly to 400 invalid_request.
 */
function readBoundedJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const finish = (value: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      request.removeListener('data', onData);
      request.removeListener('end', onEnd);
      request.removeListener('error', onError);
      resolveBody(value);
    };

    const onData = (chunk: Buffer): void => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        request.resume();
        finish(undefined);
        return;
      }
      chunks.push(chunk);
    };

    const onEnd = (): void => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.length === 0) {
        finish(undefined);
        return;
      }
      try {
        finish(JSON.parse(raw));
      } catch {
        finish(undefined);
      }
    };

    const onError = (): void => finish(undefined);

    request.on('data', onData);
    request.on('end', onEnd);
    request.on('error', onError);
  });
}

function withHandlerTimeout<T>(operation: Promise<T>, timeoutMillis: number): Promise<T> {
  return new Promise((resolveOperation, rejectOperation) => {
    const timer = setTimeout(() => {
      rejectOperation(new Error(`Guest identity handler operation exceeded ${timeoutMillis}ms.`));
    }, timeoutMillis);

    operation.then(
      (value) => {
        clearTimeout(timer);
        resolveOperation(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        rejectOperation(error);
      }
    );
  });
}

export async function handleIdentityGuestRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: IdentityGuestEndpointContext
): Promise<void> {
  const method = request.method ?? '';

  if (method !== 'OPTIONS' && method !== 'POST') {
    response.writeHead(405, { Allow: 'POST, OPTIONS', 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'invalid_request' } satisfies IdentityHttpErrorResponse));
    return;
  }

  const originEvaluation = evaluateRequestOrigin(context.networkBoundaryConfig, request.headers.origin);

  if (!originEvaluation.allowed) {
    response.writeHead(403, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'invalid_request' } satisfies IdentityHttpErrorResponse));
    return;
  }

  const corsHeaders = corsHeadersForAllowedOrigin(originEvaluation.normalizedOrigin);

  if (method === 'OPTIONS') {
    response.writeHead(204, {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  // PERSIST002-NET-02: admission identity is resolved AFTER the Origin gate
  // (so a hostile Origin still never consumes a budget token) and through the
  // one canonical resolver shared with fresh BattleRoom.onAuth. A rejected
  // trusted-edge assertion fails closed onto the existing 429 rate_limited
  // shape -- no new client protocol field, and no shared trusted-proxy bucket.
  const admission = context.admissionPeerIdentity.resolve({
    headers: request.headers,
    directPeerAddress: request.socket.remoteAddress
  });

  const limiterResult = admission.kind === 'resolved' ? context.limiter.consume(admission.peerKey) : undefined;

  if (!limiterResult || !limiterResult.allowed) {
    const retryAfterMs = limiterResult?.retryAfterMs ?? 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    writeJson(response, 429, { ok: false, error: 'rate_limited' } satisfies IdentityHttpErrorResponse, {
      ...corsHeaders,
      'Retry-After': String(retryAfterSeconds)
    });
    request.resume();
    return;
  }

  const contentType = request.headers['content-type'];

  if (!contentType || !CONTENT_TYPE_PATTERN.test(contentType)) {
    writeJson(response, 400, { ok: false, error: 'invalid_request' } satisfies IdentityHttpErrorResponse, corsHeaders);
    request.resume();
    return;
  }

  const body = await readBoundedJsonBody(request);

  if (!isValidGuestCreateRequest(body)) {
    writeJson(response, 400, { ok: false, error: 'invalid_request' } satisfies IdentityHttpErrorResponse, corsHeaders);
    return;
  }

  if (!context.isLifecycleReady()) {
    writeJson(
      response,
      503,
      { ok: false, error: 'persistence_unavailable' } satisfies IdentityHttpErrorResponse,
      corsHeaders
    );
    return;
  }

  const writerAuthority = context.getWriterAuthority();
  const pool = context.getPool();

  if (!writerAuthority || !writerAuthority.isControlSafe() || !pool) {
    writeJson(
      response,
      503,
      { ok: false, error: 'persistence_unavailable' } satisfies IdentityHttpErrorResponse,
      corsHeaders
    );
    return;
  }

  try {
    const generated = generateCredential();

    const player = await withHandlerTimeout(
      withTransaction(pool, async (client) => {
        const createdPlayer = await createPlayer(client);
        await insertCredential(client, createdPlayer.playerId, {
          version: CREDENTIAL_VERSION,
          algorithm: CREDENTIAL_ALGORITHM,
          hash: generated.verifier
        });
        return createdPlayer;
      }),
      HANDLER_TIMEOUT_MILLIS
    );

    writeJson(
      response,
      201,
      {
        ok: true,
        playerId: player.playerId,
        credential: generated.credential
      } satisfies GuestIdentityCreateSuccess,
      { ...corsHeaders, 'Cache-Control': 'no-store' }
    );
    context.log('info', 'guest_identity_created');
  } catch (error) {
    context.log('error', 'guest_identity_create_failed', {
      errorName: error instanceof Error ? error.name : 'Error'
    });
    writeJson(response, 500, { ok: false, error: 'internal_error' } satisfies IdentityHttpErrorResponse, corsHeaders);
  }
}
