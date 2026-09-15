import type { Pool, PoolClient } from 'pg';
import { withTransaction } from './pool.js';
import * as worldsRepository from './repositories/worldsRepository.js';
import * as playersRepository from './repositories/playersRepository.js';
import * as credentialsRepository from './repositories/credentialsRepository.js';
import * as membershipsRepository from './repositories/membershipsRepository.js';
import * as sessionLeasesRepository from './repositories/sessionLeasesRepository.js';

export type Faction = 'red' | 'blue';

/**
 * Added to the caller-supplied reconnect grace (already validated by
 * networkBoundary.ts, 1..60s) to obtain the active-lease TTL. A connected,
 * heartbeating session (every 5s) never approaches this bound; it exists to
 * bound how long a lease that stops heartbeating (process crash, network
 * partition before onLeave fires) remains 'active' before it becomes
 * reclaimable.
 */
export const ACTIVE_LEASE_TTL_EXTRA_SECONDS = 15;

export function computeActiveLeaseTtlSeconds(reconnectGraceSeconds: number): number {
  return reconnectGraceSeconds + ACTIVE_LEASE_TTL_EXTRA_SECONDS;
}

export interface ApplyProfileContext {
  readonly playerId: string;
  readonly credentialId: string;
  readonly transportSessionId: string;
  readonly roomId: string;
  readonly nickname: string;
  readonly reconnectGraceSeconds: number;
}

export interface ApplyPlayerProfileContext extends ApplyProfileContext {
  readonly faction: Faction;
}

/**
 * Discriminated, DB-detail-free result: never leaks lease/credential/writer
 * internal identifiers or SQL state to callers that forward reasons to the
 * client.
 */
export type ProfileTransactionResult =
  | { readonly kind: 'spectator_accepted' }
  | { readonly kind: 'player_accepted'; readonly faction: Faction; readonly leaseId: string }
  | { readonly kind: 'faction_conflict' }
  | { readonly kind: 'identity_in_use' }
  | { readonly kind: 'credential_invalid' }
  | { readonly kind: 'writer_authority_lost' };

export interface LeaseSessionParams {
  readonly playerId: string;
  readonly credentialId: string;
  readonly leaseId: string;
  readonly graceSeconds: number;
}

export type MarkRecoveringOutcome = sessionLeasesRepository.MarkRecoveringResult;

export type ResumeSessionResult =
  | { readonly outcome: 'resumed'; readonly expiresAt: Date }
  | { readonly outcome: 'rejected'; readonly reason: 'writer_authority_lost' | 'credential_invalid' | 'membership_missing' | 'lease_invalid' };

export interface ResumeSessionParams extends LeaseSessionParams {
  /** True for a player-mode session: membership+durable faction must still exist. */
  readonly requireFaction: boolean;
}

export interface GameplayAuthorityOptions {
  readonly pool: Pool;
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
}

export interface GameplayAuthorityTestHooks {
  /**
   * Test-only. Invoked immediately after applyPlayerProfile's transaction
   * has REALLY committed, before the caller observes the result. Throwing
   * here simulates "the process could not observe whether COMMIT
   * succeeded" without faking any DB state -- the commit already happened.
   */
  afterPlayerProfileCommit?(): void;
  /**
   * Test-only. Awaited at the very start of applyPlayerProfile, before its
   * transaction begins. Lets a test deterministically hold an operation
   * "in flight" (already queued, not yet committed) to race it against a
   * concurrent onLeave/disconnect -- see asyncProfileDisconnectRace.test.ts.
   */
  beforePlayerProfileTransaction?(): Promise<void> | void;
}

export interface GameplayAuthority {
  applySpectatorProfile(context: ApplyProfileContext): Promise<ProfileTransactionResult>;
  applyPlayerProfile(context: ApplyPlayerProfileContext): Promise<ProfileTransactionResult>;
  markSessionRecovering(params: LeaseSessionParams): Promise<MarkRecoveringOutcome>;
  resumeRecoveringSession(params: ResumeSessionParams): Promise<ResumeSessionResult>;
  releaseSessionLease(params: { readonly playerId: string; readonly leaseId: string }): Promise<boolean>;
  renewGameplayLease(params: LeaseSessionParams): Promise<boolean>;
}

function toFaction(faction: Faction | null): Faction {
  if (faction === null) {
    throw new Error('Expected an established faction but found none.');
  }
  return faction;
}

/**
 * Orchestrates semantic durable transactions across the narrow
 * world/player/credential/membership/session-lease repositories, in the
 * accepted lock order (world -> player -> credential -> membership ->
 * session lease). BattleRoom depends only on this narrow interface --
 * never on the raw Pool/PoolClient, and never on a generic row updater.
 */
export function createGameplayAuthority(
  options: GameplayAuthorityOptions,
  testHooks: GameplayAuthorityTestHooks = {}
): GameplayAuthority {
  const { pool, worldId, serverInstanceId, writerEpoch } = options;

  async function verifyCurrentWriter(client: PoolClient): Promise<boolean> {
    const verified = await worldsRepository.lockAndVerifyCurrentWriter(client, {
      worldId,
      serverInstanceId,
      writerEpoch
    });
    return verified !== null;
  }

  /** Shared world/player/credential prefix for both spectator and player profile transactions. */
  async function lockProfilePrefix(
    client: PoolClient,
    context: ApplyProfileContext
  ): Promise<'writer_authority_lost' | 'credential_invalid' | 'ok'> {
    if (!(await verifyCurrentWriter(client))) {
      return 'writer_authority_lost';
    }

    const player = await playersRepository.lockPlayer(client, context.playerId);
    if (!player) {
      return 'credential_invalid';
    }
    await playersRepository.updatePlayerDisplayName(client, context.playerId, context.nickname);

    const credentialActive = await credentialsRepository.lockActiveCredentialForPlayer(
      client,
      context.playerId,
      context.credentialId
    );
    if (!credentialActive) {
      return 'credential_invalid';
    }

    return 'ok';
  }

  return {
    async applySpectatorProfile(context: ApplyProfileContext): Promise<ProfileTransactionResult> {
      return withTransaction(pool, async (client) => {
        const prefix = await lockProfilePrefix(client, context);
        if (prefix !== 'ok') {
          return { kind: prefix };
        }

        // Spectator profiles never touch world_memberships or
        // active_session_leases, and never increment state_revision.
        return { kind: 'spectator_accepted' };
      });
    },

    async applyPlayerProfile(context: ApplyPlayerProfileContext): Promise<ProfileTransactionResult> {
      await testHooks.beforePlayerProfileTransaction?.();

      const result = await withTransaction<ProfileTransactionResult>(pool, async (client) => {
        const prefix = await lockProfilePrefix(client, context);
        if (prefix !== 'ok') {
          return { kind: prefix };
        }

        const factionResult = await membershipsRepository.establishPlayerFaction(
          client,
          worldId,
          context.playerId,
          context.faction
        );

        if (factionResult.outcome === 'conflict') {
          return { kind: 'faction_conflict' };
        }

        if (factionResult.outcome === 'created' || factionResult.outcome === 'assigned') {
          await worldsRepository.incrementWorldStateRevision(client, worldId);
        }

        const leaseResult = await sessionLeasesRepository.acquireGameplayLease(client, {
          worldId,
          playerId: context.playerId,
          credentialId: context.credentialId,
          serverInstanceId,
          writerEpoch,
          roomId: context.roomId,
          transportSessionId: context.transportSessionId,
          activeTtlSeconds: computeActiveLeaseTtlSeconds(context.reconnectGraceSeconds)
        });

        if (leaseResult.outcome === 'identity_in_use') {
          return { kind: 'identity_in_use' };
        }

        return {
          kind: 'player_accepted',
          faction: toFaction(factionResult.membership.faction),
          leaseId: leaseResult.leaseId
        };
      });

      // Test-only seam: the transaction above has REALLY committed by this
      // point. Throwing here simulates an uncertain post-COMMIT outcome
      // without faking DB state -- see unknownCommitOutcome.test.ts.
      testHooks.afterPlayerProfileCommit?.();

      return result;
    },

    async markSessionRecovering(params: LeaseSessionParams): Promise<MarkRecoveringOutcome> {
      return withTransaction(pool, (client) =>
        sessionLeasesRepository.markRecovering(client, {
          worldId,
          playerId: params.playerId,
          leaseId: params.leaseId,
          serverInstanceId,
          writerEpoch,
          graceSeconds: params.graceSeconds
        })
      );
    },

    async resumeRecoveringSession(params: ResumeSessionParams): Promise<ResumeSessionResult> {
      return withTransaction(pool, async (client) => {
        if (!(await verifyCurrentWriter(client))) {
          return { outcome: 'rejected', reason: 'writer_authority_lost' };
        }

        const credentialActive = await credentialsRepository.lockActiveCredentialForPlayer(
          client,
          params.playerId,
          params.credentialId
        );
        if (!credentialActive) {
          return { outcome: 'rejected', reason: 'credential_invalid' };
        }

        if (params.requireFaction) {
          const membership = await membershipsRepository.findMembership(client, worldId, params.playerId);
          if (!membership || membership.faction === null) {
            return { outcome: 'rejected', reason: 'membership_missing' };
          }
        }

        const resumedExpiresAt = await sessionLeasesRepository.resumeRecoveringLease(client, {
          worldId,
          playerId: params.playerId,
          leaseId: params.leaseId,
          credentialId: params.credentialId,
          serverInstanceId,
          writerEpoch,
          activeTtlSeconds: computeActiveLeaseTtlSeconds(params.graceSeconds)
        });

        if (!resumedExpiresAt) {
          return { outcome: 'rejected', reason: 'lease_invalid' };
        }

        return { outcome: 'resumed', expiresAt: resumedExpiresAt };
      });
    },

    async releaseSessionLease(params: { readonly playerId: string; readonly leaseId: string }): Promise<boolean> {
      return withTransaction(pool, (client) =>
        sessionLeasesRepository.releaseGameplayLease(client, {
          worldId,
          playerId: params.playerId,
          leaseId: params.leaseId
        })
      );
    },

    async renewGameplayLease(params: LeaseSessionParams): Promise<boolean> {
      return withTransaction(pool, async (client) => {
        if (!(await verifyCurrentWriter(client))) {
          return false;
        }

        const credentialActive = await credentialsRepository.isCredentialActiveForPlayer(
          client,
          params.playerId,
          params.credentialId
        );
        if (!credentialActive) {
          return false;
        }

        const renewedExpiresAt = await sessionLeasesRepository.renewGameplayLease(client, {
          worldId,
          playerId: params.playerId,
          leaseId: params.leaseId,
          serverInstanceId,
          writerEpoch,
          activeTtlSeconds: computeActiveLeaseTtlSeconds(params.graceSeconds)
        });

        return renewedExpiresAt !== null;
      });
    }
  };
}
