/**
 * Server-private binding between a transient Colyseus session and the
 * durable identity that authenticated it. Never broadcast, never stored in
 * Colyseus schema, and never carries the raw credential or its hash.
 */
export interface SessionBinding {
  readonly sessionId: string;
  readonly playerId: string;
  readonly credentialId: string;
  readonly worldId: string;
  connectionGeneration: number;
  controlAllowed: boolean;
  /** The exact durable gameplay lease this session currently holds, if any. */
  leaseId?: string;
  /** Mirrors the DB lease status this binding was last known to hold. */
  leaseStatus?: 'active' | 'recovering';
}

export interface ActiveLeaseBinding {
  readonly sessionId: string;
  readonly playerId: string;
  readonly leaseId: string;
}

export interface BindFreshSessionAuth {
  readonly playerId: string;
  readonly credentialId: string;
  readonly worldId: string;
}

export class SessionBindingRegistry {
  private readonly bindings = new Map<string, SessionBinding>();

  bindFreshSession(sessionId: string, auth: BindFreshSessionAuth): SessionBinding {
    const binding: SessionBinding = {
      sessionId,
      playerId: auth.playerId,
      credentialId: auth.credentialId,
      worldId: auth.worldId,
      connectionGeneration: 0,
      controlAllowed: true
    };
    this.bindings.set(sessionId, binding);
    return binding;
  }

  get(sessionId: string): SessionBinding | undefined {
    return this.bindings.get(sessionId);
  }

  /**
   * Call once at the start of an async revalidation. Compare the returned
   * generation against isCurrentGeneration() after the awaited work
   * completes, and discard the result if it no longer matches -- this
   * protects against a stale completion reopening control after a newer
   * connection attempt (or finalize) has already superseded it.
   */
  beginConnectionGeneration(sessionId: string): number | undefined {
    const binding = this.bindings.get(sessionId);

    if (!binding) {
      return undefined;
    }

    binding.connectionGeneration += 1;
    return binding.connectionGeneration;
  }

  isCurrentGeneration(sessionId: string, generation: number): boolean {
    const binding = this.bindings.get(sessionId);
    return binding !== undefined && binding.connectionGeneration === generation;
  }

  setControlAllowed(sessionId: string, allowed: boolean): void {
    const binding = this.bindings.get(sessionId);

    if (binding) {
      binding.controlAllowed = allowed;
    }
  }

  isControlAllowed(sessionId: string): boolean {
    return this.bindings.get(sessionId)?.controlAllowed === true;
  }

  remove(sessionId: string): boolean {
    return this.bindings.delete(sessionId);
  }

  setLease(sessionId: string, leaseId: string, status: 'active' | 'recovering'): void {
    const binding = this.bindings.get(sessionId);

    if (binding) {
      binding.leaseId = leaseId;
      binding.leaseStatus = status;
    }
  }

  clearLease(sessionId: string): void {
    const binding = this.bindings.get(sessionId);

    if (binding) {
      binding.leaseId = undefined;
      binding.leaseStatus = undefined;
    }
  }

  /**
   * A point-in-time copy for the room-level lease heartbeat: only sessions
   * that are currently control-allowed with a logically active (not
   * recovering) lease are eligible for renewal.
   */
  snapshotActiveLeaseBindings(): ActiveLeaseBinding[] {
    const snapshot: ActiveLeaseBinding[] = [];

    for (const binding of this.bindings.values()) {
      if (binding.controlAllowed && binding.leaseStatus === 'active' && binding.leaseId !== undefined) {
        snapshot.push({ sessionId: binding.sessionId, playerId: binding.playerId, leaseId: binding.leaseId });
      }
    }

    return snapshot;
  }
}
