import type { Faction, JoinMode } from './factions.js';

export interface JoinRequest {
  nickname: string;
  mode: JoinMode;
  faction?: Faction;
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
