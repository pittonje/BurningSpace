import type { Faction } from './factions.js';

export const ProfileClientMessages = {
  SET_PROFILE: 'setProfile'
} as const;

export const ProfileServerMessages = {
  PROFILE_ACCEPTED: 'profileAccepted',
  PROFILE_REJECTED: 'profileRejected'
} as const;

export type JoinMode = 'player' | 'spectator';

export interface JoinRequest {
  nickname: string;
  mode: JoinMode;
  faction?: Faction;
}

export interface RoomParticipant {
  sessionId: string;
  nickname: string;
  mode: JoinMode;
  faction?: Faction;
  connectedAt: number;
}

export interface ProfileAcceptedMessage extends RoomParticipant {}

export interface ProfileRejectedMessage {
  reason: string;
}
