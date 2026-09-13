import { Client, type Room } from 'colyseus.js';
import {
  IdentityGuestIntent,
  type GuestIdentityCreateSuccess,
  type IdentityHttpErrorResponse,
  type WorldBattleRoomDiscoverySuccess
} from '@burningspace/shared';
import type {
  DurableIdentity,
  IdentityClearResult,
  IdentityReadResult,
  IdentityWriteResult
} from '../../client/src/network/identityStorage';

export interface TestGuestIdentity {
  readonly playerId: string;
  readonly credential: string;
}

function originHeaders(origin?: string): Record<string, string> | undefined {
  return origin === undefined ? undefined : { Origin: origin };
}

/**
 * Creates a real guest identity through the public POST /identity/guest
 * boundary -- exactly what a browser client would do. Never inserts a
 * credential row directly, so every join in a test exercises the same
 * database-backed authentication path production traffic does.
 */
export async function createTestGuestIdentity(
  serverUrl: string,
  origin?: string
): Promise<TestGuestIdentity> {
  const response = await fetch(`${serverUrl}/identity/guest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...originHeaders(origin)
    },
    body: JSON.stringify({ intent: IdentityGuestIntent })
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as IdentityHttpErrorResponse | undefined;
    throw new Error(
      `POST /identity/guest failed with status ${response.status}${body ? ` (${body.error})` : ''}.`
    );
  }

  const body = (await response.json()) as GuestIdentityCreateSuccess;
  return { playerId: body.playerId, credential: body.credential };
}

/**
 * Discovers the current canonical battle room ID through the public
 * GET /world/battle-room boundary. Never looks up matchMaker state
 * directly, so tests exercise the same non-authenticating discovery path a
 * browser client uses before joining.
 */
export async function discoverCanonicalBattleRoom(serverUrl: string, origin?: string): Promise<string> {
  const response = await fetch(`${serverUrl}/world/battle-room`, {
    method: 'GET',
    headers: originHeaders(origin)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as IdentityHttpErrorResponse | undefined;
    throw new Error(
      `GET /world/battle-room failed with status ${response.status}${body ? ` (${body.error})` : ''}.`
    );
  }

  const body = (await response.json()) as WorldBattleRoomDiscoverySuccess;
  return body.roomId;
}

export interface InMemoryIdentityStorage {
  readIdentity(): IdentityReadResult;
  saveIdentity(identity: DurableIdentity): IdentityWriteResult;
  clearIdentity(): IdentityClearResult;
}

/**
 * A NetworkClient identityStorage adapter backed by a private in-memory
 * slot instead of the real browser localStorage. Lets a single Node
 * integration-test process simulate several independent browser identities
 * at once (one per NetworkClient instance), which real localStorage
 * (process-global, unavailable outside a browser/jsdom) cannot do.
 */
export function createInMemoryIdentityStorage(): InMemoryIdentityStorage {
  let slot: DurableIdentity | undefined;

  return {
    readIdentity(): IdentityReadResult {
      return slot ? { status: 'available', identity: slot } : { status: 'missing' };
    },
    saveIdentity(identity: DurableIdentity): IdentityWriteResult {
      slot = identity;
      return 'saved';
    },
    clearIdentity(): IdentityClearResult {
      slot = undefined;
      return 'cleared';
    }
  };
}

/**
 * Joins the canonical battle room exactly the way the client's
 * discovery-then-joinById flow does: discover the current room ID, then
 * joinById with only the credential as join authority. Never uses
 * joinOrCreate.
 */
export async function joinCanonicalBattleRoom<TState = unknown>(
  serverUrl: string,
  credential: string,
  origin?: string
): Promise<Room<TState>> {
  const roomId = await discoverCanonicalBattleRoom(serverUrl, origin);
  const client = origin === undefined ? new Client(serverUrl) : new Client(serverUrl, { headers: { Origin: origin } });
  return client.joinById<TState>(roomId, { credential });
}
