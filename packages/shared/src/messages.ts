import type { Faction, JoinMode } from './factions.js';

export const ClientMessages = {
  SET_PROFILE: 'setProfile',
  PLAYER_INPUT: 'playerInput'
} as const;

export const ServerMessages = {
  PROFILE_ACCEPTED: 'profileAccepted',
  PROFILE_REJECTED: 'profileRejected',
  ROOM_INFO: 'roomInfo'
} as const;

export type ClientMessageType = (typeof ClientMessages)[keyof typeof ClientMessages];
export type ServerMessageType = (typeof ServerMessages)[keyof typeof ServerMessages];

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

export interface ShipSnapshot {
  id: string;
  ownerSessionId: string;
  nickname: string;
  faction: Faction;
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  lastProcessedInput: number;
  active: boolean;
}

export interface ProfileAcceptedMessage extends RoomParticipant {}

export interface ProfileRejectedMessage {
  reason: string;
}

export interface RoomInfoMessage {
  roomId: string;
  connectedClients: number;
  maxClients: number;
}

export interface PlayerInputMessage {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  aimAngle: number;
  sequence: number;
}
