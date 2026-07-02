import type { Faction, JoinMode } from './factions.js';

export const ClientMessages = {
  SET_PROFILE: 'setProfile',
  PLAYER_INPUT: 'playerInput'
} as const;

export const ServerMessages = {
  PROFILE_ACCEPTED: 'profileAccepted',
  PROFILE_REJECTED: 'profileRejected',
  ROOM_INFO: 'roomInfo',
  HIT_EVENT: 'hitEvent',
  SHIP_DESTROYED: 'shipDestroyed'
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
  health: number;
  maxHealth: number;
  alive: boolean;
  respawnAt: number;
  invulnerableUntil: number;
  lastDamageAt: number;
}

export interface ProjectileSnapshot {
  id: string;
  ownerSessionId: string;
  faction: Faction;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  spawnX: number;
  spawnY: number;
  distanceTraveled: number;
  active: boolean;
  createdAt: number;
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

export interface HitEventMessage {
  projectileId: string;
  targetShipId: string;
  x: number;
  y: number;
  damage: number;
}

export interface ShipDestroyedMessage {
  shipId: string;
  x: number;
  y: number;
  respawnAt: number;
}

export interface PlayerInputMessage {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  aimAngle: number;
  shooting: boolean;
  sequence: number;
}
