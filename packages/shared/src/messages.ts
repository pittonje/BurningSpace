import type { Faction } from './factions.js';
import { ProfileClientMessages, ProfileServerMessages } from './profile-contract.js';

// Preserve the pre-isolation direct module type surface for compatibility.
export type {
  JoinRequest,
  ProfileAcceptedMessage,
  ProfileRejectedMessage,
  RoomParticipant
} from './profile-contract.js';

export const ClientMessages = {
  SET_PROFILE: ProfileClientMessages.SET_PROFILE,
  PLAYER_INPUT: 'playerInput'
} as const;

export const ServerMessages = {
  PROFILE_ACCEPTED: ProfileServerMessages.PROFILE_ACCEPTED,
  PROFILE_REJECTED: ProfileServerMessages.PROFILE_REJECTED,
  ROOM_INFO: 'roomInfo',
  HIT_EVENT: 'hitEvent',
  SHIP_DESTROYED: 'shipDestroyed'
} as const;

export type ClientMessageType = (typeof ClientMessages)[keyof typeof ClientMessages];
export type ServerMessageType = (typeof ServerMessages)[keyof typeof ServerMessages];

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

export interface RoomInfoMessage {
  roomId: string;
  connectedClients: number;
  maxClients: number;
  serverTime: number;
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
