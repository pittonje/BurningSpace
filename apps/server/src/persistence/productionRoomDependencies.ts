import type { AuthContext } from 'colyseus';
import type { Pool } from 'pg';
import { parseCredential } from './credential.js';
import { findActiveCredentialByHash, isCredentialActiveForPlayer } from './repositories/credentialsRepository.js';
import type { PeerRateLimiter } from '../security/peerRateLimiter.js';
import { SessionBindingRegistry } from './sessionBinding.js';

/**
 * Narrow, server-private authentication result. Never carries the raw
 * credential or its hash past this module.
 */
export interface DurableRoomAuth {
  readonly playerId: string;
  readonly credentialId: string;
  readonly worldId: string;
}

export interface WriterAuthoritySafe {
  isControlSafe(): boolean;
}

/**
 * The narrow authority surface BattleRoom.static onAuth (and later message
 * handlers) are allowed to depend on. Deliberately excludes DATABASE_URL,
 * the Pool itself, and any credential/hash material.
 */
export interface ProductionRoomDependencies {
  readonly worldId: string;
  readonly writerEpoch: bigint;
  readonly freshAuthLimiter: PeerRateLimiter;
  readonly sessionBindings: SessionBindingRegistry;
  isAuthoritySafe(): boolean;
  authenticateCredential(rawCredential: unknown): Promise<DurableRoomAuth | undefined>;
  revalidateCredential(playerId: string, credentialId: string): Promise<boolean>;
  getAuthPeerKey(context: AuthContext): string;
}

const FALLBACK_PEER_KEY = 'matchmaking-peer';

export interface CreateProductionRoomDependenciesOptions {
  readonly worldId: string;
  readonly writerEpoch: bigint;
  readonly pool: Pool;
  readonly writer: WriterAuthoritySafe;
  readonly freshAuthLimiter: PeerRateLimiter;
}

/**
 * context.ip is populated from X-Real-IP / X-Forwarded-For before falling
 * back to the socket address (verified against the installed
 * @colyseus/ws-transport and @colyseus/core sources), so it is NOT a
 * trustworthy peer key. context.req (present for fresh HTTP matchmake
 * requests, the only path that invokes onAuth) exposes the raw
 * IncomingMessage; its socket.remoteAddress is the trustworthy direct
 * transport peer. When req/socket are unavailable, fall back to one fixed
 * conservative key shared by all callers.
 */
function resolveAuthPeerKey(context: AuthContext): string {
  return context.req?.socket?.remoteAddress ?? FALLBACK_PEER_KEY;
}

export function createProductionRoomDependencies(
  options: CreateProductionRoomDependenciesOptions
): ProductionRoomDependencies {
  const sessionBindings = new SessionBindingRegistry();

  return {
    worldId: options.worldId,
    writerEpoch: options.writerEpoch,
    freshAuthLimiter: options.freshAuthLimiter,
    sessionBindings,
    isAuthoritySafe: () => options.writer.isControlSafe(),
    getAuthPeerKey: resolveAuthPeerKey,
    authenticateCredential: async (rawCredential) => {
      if (!options.writer.isControlSafe()) {
        return undefined;
      }

      const parsed = parseCredential(rawCredential);

      if (!parsed) {
        return undefined;
      }

      const lookup = await findActiveCredentialByHash(options.pool, parsed.verifier);

      if (lookup.status !== 'active' || !lookup.playerId || !lookup.credentialId) {
        return undefined;
      }

      return { playerId: lookup.playerId, credentialId: lookup.credentialId, worldId: options.worldId };
    },
    revalidateCredential: async (playerId, credentialId) => {
      if (!options.writer.isControlSafe()) {
        return false;
      }

      return isCredentialActiveForPlayer(options.pool, playerId, credentialId);
    }
  };
}

interface InstallationRecord {
  readonly dependencies: ProductionRoomDependencies;
  active: boolean;
}

const installations: InstallationRecord[] = [];

export interface ProductionRoomDependenciesInstallation {
  readonly dependencies: ProductionRoomDependencies;
  restore(): void;
}

function compactInactiveInstallations(): void {
  for (let index = installations.length - 1; index >= 0; index -= 1) {
    if (installations[index]?.active) {
      return;
    }

    installations.pop();
  }
}

/**
 * Stack-based install/restore, modeled on networkBoundary.ts's pattern:
 * tests may install and restore per server without leaking stale
 * dependencies into a later, unrelated server instance.
 */
export function installProductionRoomDependencies(
  dependencies: ProductionRoomDependencies
): ProductionRoomDependenciesInstallation {
  const record: InstallationRecord = { dependencies, active: true };
  installations.push(record);
  let restored = false;

  return Object.freeze({
    dependencies,
    restore(): void {
      if (restored) {
        return;
      }

      restored = true;
      record.active = false;
      compactInactiveInstallations();
    }
  });
}

export function getActiveProductionRoomDependencies(): ProductionRoomDependencies | undefined {
  for (let index = installations.length - 1; index >= 0; index -= 1) {
    const installation = installations[index];

    if (installation?.active) {
      return installation.dependencies;
    }
  }

  return undefined;
}
