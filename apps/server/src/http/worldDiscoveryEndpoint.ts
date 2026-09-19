import type { IncomingMessage, ServerResponse } from 'node:http';
import type { IdentityHttpErrorResponse, WorldBattleRoomDiscoverySuccess } from '@burningspace/shared';
import { evaluateRequestOrigin, type NetworkBoundaryConfig } from '../security/networkBoundary.js';
import type { WriterAuthoritySafe } from './identityGuestEndpoint.js';

const WORLD_BATTLE_ROOM_PATH = '/world/battle-room';

export interface WorldDiscoveryEndpointContext {
  isLifecycleReady(): boolean;
  getWriterAuthority(): WriterAuthoritySafe | undefined;
  getCanonicalRoomId(): string | undefined;
  readonly networkBoundaryConfig: NetworkBoundaryConfig;
}

export function matchesWorldDiscoveryPath(pathname: string): boolean {
  return pathname === WORLD_BATTLE_ROOM_PATH;
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

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>
): void {
  response.writeHead(status, { 'content-type': 'application/json', ...extraHeaders });
  response.end(JSON.stringify(body));
}

/**
 * Non-authenticating discovery: reveals only the current non-secret
 * canonical room ID. Never creates or looks up a room/world here.
 */
export function handleWorldDiscoveryRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: WorldDiscoveryEndpointContext
): void {
  const method = request.method ?? '';

  if (method !== 'GET' && method !== 'OPTIONS') {
    response.writeHead(405, { Allow: 'GET, OPTIONS', 'content-type': 'application/json' });
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
    response.writeHead(204, { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
    response.end();
    return;
  }

  if (!context.isLifecycleReady()) {
    writeJson(response, 503, { ok: false, error: 'world_unavailable' } satisfies IdentityHttpErrorResponse, corsHeaders);
    return;
  }

  const writerAuthority = context.getWriterAuthority();

  if (!writerAuthority || !writerAuthority.isControlSafe()) {
    writeJson(response, 503, { ok: false, error: 'world_unavailable' } satisfies IdentityHttpErrorResponse, corsHeaders);
    return;
  }

  const roomId = context.getCanonicalRoomId();

  if (!roomId) {
    writeJson(response, 503, { ok: false, error: 'world_unavailable' } satisfies IdentityHttpErrorResponse, corsHeaders);
    return;
  }

  writeJson(
    response,
    200,
    { ok: true, roomId } satisfies WorldBattleRoomDiscoverySuccess,
    { ...corsHeaders, 'Cache-Control': 'no-store' }
  );
}
