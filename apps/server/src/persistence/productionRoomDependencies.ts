import { ErrorCode, ServerError, type AuthContext } from 'colyseus';
import type { Pool } from 'pg';
import { parseCredential } from './credential.js';
import { findActiveCredentialByHash, isCredentialActiveForPlayer } from './repositories/credentialsRepository.js';
import type { AdmissionPeerIdentityResolver } from '../security/admissionPeerIdentity.js';
import type { PeerRateLimiter } from '../security/peerRateLimiter.js';
import { SessionBindingRegistry } from './sessionBinding.js';
import {
  createGameplayAuthority,
  type ApplyPlayerProfileContext,
  type ApplyProfileContext,
  type GameplayAuthorityTestHooks,
  type LeaseSessionParams,
  type MarkRecoveringOutcome,
  type ProfileTransactionResult,
  type ResumeSessionParams,
  type ResumeSessionResult
} from './gameplayAuthority.js';

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
  applySpectatorProfile(context: ApplyProfileContext): Promise<ProfileTransactionResult>;
  applyPlayerProfile(context: ApplyPlayerProfileContext): Promise<ProfileTransactionResult>;
  markSessionRecovering(params: LeaseSessionParams): Promise<MarkRecoveringOutcome>;
  resumeRecoveringSession(params: ResumeSessionParams): Promise<ResumeSessionResult>;
  releaseSessionLease(params: { readonly playerId: string; readonly leaseId: string }): Promise<boolean>;
  renewGameplayLease(params: LeaseSessionParams): Promise<boolean>;
}

export interface CreateProductionRoomDependenciesOptions {
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
  readonly pool: Pool;
  readonly writer: WriterAuthoritySafe;
  readonly freshAuthLimiter: PeerRateLimiter;
  /** PERSIST002-NET-02: the single canonical admission-peer identity resolver. */
  readonly admissionPeerIdentity: AdmissionPeerIdentityResolver;
  /** Test-only: forwarded to gameplayAuthority.ts's createGameplayAuthority(). */
  readonly gameplayAuthorityTestHooks?: GameplayAuthorityTestHooks;
}

/**
 * context.ip is populated from X-Real-IP / X-Forwarded-For before falling
 * back to the socket address (verified against the installed
 * @colyseus/ws-transport and @colyseus/core sources), so it is NOT a
 * trustworthy peer key and is never read here. context.req (present for
 * fresh HTTP matchmake requests, the only path that invokes onAuth) exposes
 * the raw IncomingMessage: its socket.remoteAddress is the trustworthy
 * direct transport peer and its headers carry the internal edge assertion.
 *
 * PERSIST002-NET-02: both are handed to the ONE canonical admission
 * resolver, exactly as POST /identity/guest does. When the direct peer is
 * trusted but its internal assertion is missing or malformed, the resolver
 * rejects and this throws the EXISTING `auth_rate_limited` failure shape --
 * fail-closed, with no shared trusted-proxy bucket, no new client protocol
 * field, and no change to BattleRoom.onAuth's own logic. Origin rejection
 * still happens before this is ever reached.
 */
function resolveAuthPeerKey(resolver: AdmissionPeerIdentityResolver, context: AuthContext): string {
  const admission = resolver.resolve({
    headers: context.req?.headers,
    directPeerAddress: context.req?.socket?.remoteAddress
  });

  if (admission.kind === 'rejected') {
    throw new ServerError(ErrorCode.AUTH_FAILED, 'auth_rate_limited');
  }

  return admission.peerKey;
}

export function createProductionRoomDependencies(
  options: CreateProductionRoomDependenciesOptions
): ProductionRoomDependencies {
  const sessionBindings = new SessionBindingRegistry();
  const gameplayAuthority = createGameplayAuthority(
    {
      pool: options.pool,
      worldId: options.worldId,
      serverInstanceId: options.serverInstanceId,
      writerEpoch: options.writerEpoch
    },
    options.gameplayAuthorityTestHooks
  );

  return {
    worldId: options.worldId,
    writerEpoch: options.writerEpoch,
    freshAuthLimiter: options.freshAuthLimiter,
    sessionBindings,
    isAuthoritySafe: () => options.writer.isControlSafe(),
    getAuthPeerKey: (context) => resolveAuthPeerKey(options.admissionPeerIdentity, context),
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
    },
    // Packet-5 pattern: a cheap local isControlSafe() gate BEFORE ever
    // opening a transaction, in addition to (never instead of) the
    // DB-verified writer check gameplayAuthority performs INSIDE each
    // transaction.
    applySpectatorProfile: async (context) => {
      if (!options.writer.isControlSafe()) {
        return { kind: 'writer_authority_lost' };
      }
      return gameplayAuthority.applySpectatorProfile(context);
    },
    applyPlayerProfile: async (context) => {
      if (!options.writer.isControlSafe()) {
        return { kind: 'writer_authority_lost' };
      }
      return gameplayAuthority.applyPlayerProfile(context);
    },
    markSessionRecovering: (params) => gameplayAuthority.markSessionRecovering(params),
    resumeRecoveringSession: async (params) => {
      if (!options.writer.isControlSafe()) {
        return { outcome: 'rejected', reason: 'writer_authority_lost' };
      }
      return gameplayAuthority.resumeRecoveringSession(params);
    },
    releaseSessionLease: (params) => gameplayAuthority.releaseSessionLease(params),
    renewGameplayLease: async (params) => {
      if (!options.writer.isControlSafe()) {
        return false;
      }
      return gameplayAuthority.renewGameplayLease(params);
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
