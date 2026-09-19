export const IdentityGuestIntent = 'create_guest' as const;

export interface GuestIdentityCreateRequest {
  readonly intent: typeof IdentityGuestIntent;
}

export interface GuestIdentityCreateSuccess {
  readonly ok: true;
  readonly playerId: string;
  readonly credential: string;
}

export interface WorldBattleRoomDiscoverySuccess {
  readonly ok: true;
  readonly roomId: string;
}

export type IdentityHttpErrorCode =
  | 'invalid_request'
  | 'rate_limited'
  | 'persistence_unavailable'
  | 'world_unavailable'
  | 'internal_error';

export interface IdentityHttpErrorResponse {
  readonly ok: false;
  readonly error: IdentityHttpErrorCode;
}
