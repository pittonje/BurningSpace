import { Client, Room, getStateCallbacks } from 'colyseus.js';
import type { MapSchema } from '@colyseus/schema';
import {
  ClientMessages as ProfileClientMessages,
  ServerMessages as ProfileServerMessages,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomParticipant
} from '@burningspace/protocol';
import {
  ClientMessages,
  ServerMessages,
  type Faction,
  type HitEventMessage,
  type PlayerInputMessage,
  type ProjectileSnapshot,
  type RoomInfoMessage,
  type ShipDestroyedMessage,
  type ShipSnapshot
} from '@burningspace/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Unsubscribe = () => void;
export type PlayerInputPayload = Omit<PlayerInputMessage, 'sequence'>;

interface ParticipantStateSchema {
  sessionId: string;
  nickname: string;
  mode: JoinMode;
  faction: '' | Faction;
  connectedAt: number;
  profileReady: boolean;
}

interface ShipStateSchema {
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

interface ProjectileStateSchema {
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

interface BattleStateSchema {
  participants: MapSchema<ParticipantStateSchema, string>;
  ships: MapSchema<ShipStateSchema, string>;
  projectiles: MapSchema<ProjectileStateSchema, string>;
  roomCreatedAt: number;
}

export interface ConnectionState {
  status: ConnectionStatus;
  error?: string;
  profileError?: string;
  roomInfo?: RoomInfoMessage;
}

export interface NetworkClientOptions {
  roomName?: string;
  serverUrl?: string;
}

type StateCallbacks = ReturnType<typeof getStateCallbacks<BattleStateSchema>>;
type ParticipantCallback = (participant: RoomParticipant) => void;
type RemovedParticipantCallback = (sessionId: string) => void;
type ShipCallback = (ship: ShipSnapshot) => void;
type RemovedShipCallback = (shipId: string) => void;
type ProjectileCallback = (projectile: ProjectileSnapshot) => void;
type RemovedProjectileCallback = (projectileId: string) => void;
type HitEventCallback = (message: HitEventMessage) => void;
type ShipDestroyedCallback = (message: ShipDestroyedMessage) => void;
type ConnectionStateCallback = (state: ConnectionState) => void;

const DEFAULT_SERVER_URL = 'http://localhost:2567';
const importMetaEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean; VITE_SERVER_URL?: string } }).env;
const isDev = Boolean(importMetaEnv?.DEV);

function getServerUrl(): string {
  const envUrl = importMetaEnv?.VITE_SERVER_URL;
  return typeof envUrl === 'string' && envUrl.trim().length > 0 ? envUrl.trim() : DEFAULT_SERVER_URL;
}

function toParticipant(schema: ParticipantStateSchema): RoomParticipant {
  return {
    sessionId: schema.sessionId,
    nickname: schema.nickname,
    mode: schema.mode,
    faction: schema.faction === '' ? undefined : schema.faction,
    connectedAt: schema.connectedAt
  };
}

function toShipSnapshot(schema: ShipStateSchema): ShipSnapshot {
  return {
    id: schema.id,
    ownerSessionId: schema.ownerSessionId,
    nickname: schema.nickname,
    faction: schema.faction,
    x: schema.x,
    y: schema.y,
    rotation: schema.rotation,
    velocityX: schema.velocityX,
    velocityY: schema.velocityY,
    lastProcessedInput: schema.lastProcessedInput,
    active: schema.active,
    health: schema.health,
    maxHealth: schema.maxHealth,
    alive: schema.alive,
    respawnAt: schema.respawnAt,
    invulnerableUntil: schema.invulnerableUntil,
    lastDamageAt: schema.lastDamageAt
  };
}

function toProjectileSnapshot(schema: ProjectileStateSchema): ProjectileSnapshot {
  return {
    id: schema.id,
    ownerSessionId: schema.ownerSessionId,
    faction: schema.faction,
    x: schema.x,
    y: schema.y,
    previousX: schema.previousX,
    previousY: schema.previousY,
    velocityX: schema.velocityX,
    velocityY: schema.velocityY,
    rotation: schema.rotation,
    spawnX: schema.spawnX,
    spawnY: schema.spawnY,
    distanceTraveled: schema.distanceTraveled,
    active: schema.active,
    createdAt: schema.createdAt
  };
}

export class NetworkClient {
  private readonly client: Client;
  private readonly roomName: string;
  private room?: Room<BattleStateSchema>;
  private status: ConnectionStatus = 'disconnected';
  private error?: string;
  private profileError?: string;
  private roomInfo?: RoomInfoMessage;
  private acceptedProfile?: ProfileAcceptedMessage;
  private connectingPromise?: Promise<void>;
  private inputSequence = 0;
  private serverClockOffsetMs = 0;
  private readonly participants = new Map<string, RoomParticipant>();
  private readonly ships = new Map<string, ShipSnapshot>();
  private readonly projectiles = new Map<string, ProjectileSnapshot>();
  private readonly participantAddedCallbacks = new Set<ParticipantCallback>();
  private readonly participantChangedCallbacks = new Set<ParticipantCallback>();
  private readonly participantRemovedCallbacks = new Set<RemovedParticipantCallback>();
  private readonly shipAddedCallbacks = new Set<ShipCallback>();
  private readonly shipChangedCallbacks = new Set<ShipCallback>();
  private readonly shipRemovedCallbacks = new Set<RemovedShipCallback>();
  private readonly projectileAddedCallbacks = new Set<ProjectileCallback>();
  private readonly projectileChangedCallbacks = new Set<ProjectileCallback>();
  private readonly projectileRemovedCallbacks = new Set<RemovedProjectileCallback>();
  private readonly hitEventCallbacks = new Set<HitEventCallback>();
  private readonly shipDestroyedCallbacks = new Set<ShipDestroyedCallback>();
  private readonly connectionCallbacks = new Set<ConnectionStateCallback>();
  private readonly roomDisposers: Unsubscribe[] = [];
  private readonly participantDisposers = new Map<string, Unsubscribe>();
  private readonly shipDisposers = new Map<string, Unsubscribe>();
  private readonly projectileDisposers = new Map<string, Unsubscribe>();

  constructor(options: NetworkClientOptions = {}) {
    this.client = new Client(options.serverUrl ?? getServerUrl());
    this.roomName = options.roomName ?? 'battle';
  }

  get currentParticipants(): RoomParticipant[] {
    return Array.from(this.participants.values()).sort((left, right) => left.connectedAt - right.connectedAt);
  }

  get currentShips(): ShipSnapshot[] {
    return Array.from(this.ships.values()).sort((left, right) => left.ownerSessionId.localeCompare(right.ownerSessionId));
  }

  get currentProjectiles(): ProjectileSnapshot[] {
    return Array.from(this.projectiles.values()).sort((left, right) => left.createdAt - right.createdAt);
  }

  get profile(): ProfileAcceptedMessage | undefined {
    return this.acceptedProfile;
  }

  getSessionId(): string | undefined {
    return this.room?.sessionId;
  }

  getOwnShipSnapshot(): ShipSnapshot | undefined {
    const sessionId = this.getSessionId();
    return sessionId ? this.ships.get(sessionId) : undefined;
  }

  getEstimatedServerTime(): number {
    return Date.now() + this.serverClockOffsetMs;
  }

  async connect(): Promise<void> {
    if (this.room || this.connectingPromise) {
      return this.connectingPromise ?? Promise.resolve();
    }

    this.setConnectionState('connecting');
    this.connectingPromise = this.connectInternal();

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = undefined;
    }
  }

  setProfile(profile: JoinRequest): void {
    if (!this.room) {
      this.setConnectionState('error', 'Connect before applying a profile.');
      return;
    }

    this.profileError = undefined;
    this.emitConnectionState();
    this.room.send(ProfileClientMessages.SET_PROFILE, profile);
  }

  sendPlayerInput(input: PlayerInputPayload): void {
    if (!this.room || this.acceptedProfile?.mode !== 'player') {
      return;
    }

    const ownShip = this.getOwnShipSnapshot();

    if (ownShip) {
      this.inputSequence = Math.max(this.inputSequence, ownShip.lastProcessedInput);
    }

    this.inputSequence += 1;
    this.room.send(ClientMessages.PLAYER_INPUT, {
      ...input,
      sequence: this.inputSequence
    });
  }

  async disconnect(): Promise<void> {
    const room = this.room;

    this.clearRoomListeners();
    this.room = undefined;
    this.roomInfo = undefined;
    this.acceptedProfile = undefined;
    this.profileError = undefined;
    this.inputSequence = 0;
    this.serverClockOffsetMs = 0;
    this.clearParticipants();
    this.clearShips();
    this.clearProjectiles();

    if (room) {
      await room.leave(true);
    }

    this.setConnectionState('disconnected');
  }

  onParticipantAdded(callback: ParticipantCallback): Unsubscribe {
    this.participantAddedCallbacks.add(callback);
    return () => this.participantAddedCallbacks.delete(callback);
  }

  onParticipantChanged(callback: ParticipantCallback): Unsubscribe {
    this.participantChangedCallbacks.add(callback);
    return () => this.participantChangedCallbacks.delete(callback);
  }

  onParticipantRemoved(callback: RemovedParticipantCallback): Unsubscribe {
    this.participantRemovedCallbacks.add(callback);
    return () => this.participantRemovedCallbacks.delete(callback);
  }

  onShipAdded(callback: ShipCallback): Unsubscribe {
    this.shipAddedCallbacks.add(callback);
    return () => this.shipAddedCallbacks.delete(callback);
  }

  onShipChanged(callback: ShipCallback): Unsubscribe {
    this.shipChangedCallbacks.add(callback);
    return () => this.shipChangedCallbacks.delete(callback);
  }

  onShipRemoved(callback: RemovedShipCallback): Unsubscribe {
    this.shipRemovedCallbacks.add(callback);
    return () => this.shipRemovedCallbacks.delete(callback);
  }

  onProjectileAdded(callback: ProjectileCallback): Unsubscribe {
    this.projectileAddedCallbacks.add(callback);
    return () => this.projectileAddedCallbacks.delete(callback);
  }

  onProjectileChanged(callback: ProjectileCallback): Unsubscribe {
    this.projectileChangedCallbacks.add(callback);
    return () => this.projectileChangedCallbacks.delete(callback);
  }

  onProjectileRemoved(callback: RemovedProjectileCallback): Unsubscribe {
    this.projectileRemovedCallbacks.add(callback);
    return () => this.projectileRemovedCallbacks.delete(callback);
  }

  onHitEvent(callback: HitEventCallback): Unsubscribe {
    this.hitEventCallbacks.add(callback);
    return () => this.hitEventCallbacks.delete(callback);
  }

  onShipDestroyed(callback: ShipDestroyedCallback): Unsubscribe {
    this.shipDestroyedCallbacks.add(callback);
    return () => this.shipDestroyedCallbacks.delete(callback);
  }

  onConnectionStateChanged(callback: ConnectionStateCallback): Unsubscribe {
    this.connectionCallbacks.add(callback);
    callback(this.getConnectionState());
    return () => this.connectionCallbacks.delete(callback);
  }

  private async connectInternal(): Promise<void> {
    try {
      const room = await this.client.joinOrCreate<BattleStateSchema>(this.roomName);
      this.room = room;
      this.registerRoomListeners(room);
      this.registerParticipantListeners(room);
      this.registerShipListeners(room);
      this.registerProjectileListeners(room);
      this.setConnectionState('connected');
    } catch (error) {
      this.room = undefined;
      this.clearRoomListeners();
      this.profileError = undefined;
      this.clearParticipants();
      this.clearShips();
      this.clearProjectiles();
      this.setConnectionState('error', error instanceof Error ? error.message : 'Connection failed.');
    }
  }

  private registerRoomListeners(room: Room<BattleStateSchema>): void {
    room.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) => {
      this.acceptedProfile = message;
      this.profileError = undefined;
      this.setConnectionState('connected', undefined, this.roomInfo);
    });

    room.onMessage<ProfileRejectedMessage>(ProfileServerMessages.PROFILE_REJECTED, (message) => {
      this.profileError = message.reason;
      this.emitConnectionState();
    });

    room.onMessage<RoomInfoMessage>(ServerMessages.ROOM_INFO, (message) => {
      this.roomInfo = message;
      this.serverClockOffsetMs = message.serverTime - Date.now();
      this.emitConnectionState();
    });

    room.onMessage<HitEventMessage>(ServerMessages.HIT_EVENT, (message) => {
      for (const callback of this.hitEventCallbacks) {
        callback(message);
      }
    });

    room.onMessage<ShipDestroyedMessage>(ServerMessages.SHIP_DESTROYED, (message) => {
      for (const callback of this.shipDestroyedCallbacks) {
        callback(message);
      }
    });

    room.onError((code, message) => {
      this.setConnectionState('error', message ?? `Room error ${code}.`, this.roomInfo);
    });

    room.onLeave((code) => {
      this.clearRoomListeners();
      this.room = undefined;
      this.roomInfo = undefined;
      this.acceptedProfile = undefined;
      this.profileError = undefined;
      this.inputSequence = 0;
      this.serverClockOffsetMs = 0;
      this.clearParticipants();
      this.clearShips();
      this.clearProjectiles();
      this.setConnectionState(code === 1000 ? 'disconnected' : 'error', code === 1000 ? undefined : `Disconnected (${code}).`);
    });
  }

  private registerParticipantListeners(room: Room<BattleStateSchema>): void {
    const $ = getStateCallbacks(room);
    const participantsCallbacks = $(room.state).participants;

    this.roomDisposers.push(
      participantsCallbacks.onAdd((participant, sessionId) => {
        this.registerParticipantChangeListener($, participant, sessionId);
        this.upsertParticipant(toParticipant(participant), 'added');
        this.logParticipantEvent('added', sessionId);
      }, true),
      participantsCallbacks.onRemove((_participant, sessionId) => {
        this.removeParticipantChangeListener(sessionId);
        this.participants.delete(sessionId);
        this.logParticipantEvent('removed', sessionId);

        for (const callback of this.participantRemovedCallbacks) {
          callback(sessionId);
        }
      })
    );
  }

  private registerShipListeners(room: Room<BattleStateSchema>): void {
    const $ = getStateCallbacks(room);
    const shipsCallbacks = $(room.state).ships;

    this.roomDisposers.push(
      shipsCallbacks.onAdd((ship, shipId) => {
        this.registerShipChangeListener($, ship, shipId);
        this.upsertShip(toShipSnapshot(ship), 'added');
        this.logShipEvent('added', shipId);
      }, true),
      shipsCallbacks.onRemove((_ship, shipId) => {
        this.removeShipChangeListener(shipId);
        this.ships.delete(shipId);
        this.logShipEvent('removed', shipId);

        for (const callback of this.shipRemovedCallbacks) {
          callback(shipId);
        }
      })
    );
  }

  private registerProjectileListeners(room: Room<BattleStateSchema>): void {
    const $ = getStateCallbacks(room);
    const projectilesCallbacks = $(room.state).projectiles;

    this.roomDisposers.push(
      projectilesCallbacks.onAdd((projectile, projectileId) => {
        this.registerProjectileChangeListener($, projectile, projectileId);
        this.upsertProjectile(toProjectileSnapshot(projectile), 'added');
      }, true),
      projectilesCallbacks.onRemove((_projectile, projectileId) => {
        this.removeProjectileChangeListener(projectileId);
        this.projectiles.delete(projectileId);

        for (const callback of this.projectileRemovedCallbacks) {
          callback(projectileId);
        }
      })
    );
  }

  private registerShipChangeListener(
    $: StateCallbacks,
    ship: ShipStateSchema,
    shipId: string
  ): void {
    this.removeShipChangeListener(shipId);

    const dispose = $(ship).onChange(() => {
      this.upsertShip(toShipSnapshot(ship), 'changed');
    });

    this.shipDisposers.set(shipId, dispose);
  }

  private removeShipChangeListener(shipId: string): void {
    const dispose = this.shipDisposers.get(shipId);

    if (dispose) {
      dispose();
      this.shipDisposers.delete(shipId);
    }
  }

  private registerProjectileChangeListener(
    $: StateCallbacks,
    projectile: ProjectileStateSchema,
    projectileId: string
  ): void {
    this.removeProjectileChangeListener(projectileId);

    const dispose = $(projectile).onChange(() => {
      this.upsertProjectile(toProjectileSnapshot(projectile), 'changed');
    });

    this.projectileDisposers.set(projectileId, dispose);
  }

  private removeProjectileChangeListener(projectileId: string): void {
    const dispose = this.projectileDisposers.get(projectileId);

    if (dispose) {
      dispose();
      this.projectileDisposers.delete(projectileId);
    }
  }

  private registerParticipantChangeListener(
    $: StateCallbacks,
    participant: ParticipantStateSchema,
    sessionId: string
  ): void {
    this.removeParticipantChangeListener(sessionId);

    const dispose = $(participant).onChange(() => {
      this.upsertParticipant(toParticipant(participant), 'changed');
      this.logParticipantEvent('changed', sessionId);
    });

    this.participantDisposers.set(sessionId, dispose);
  }

  private removeParticipantChangeListener(sessionId: string): void {
    const dispose = this.participantDisposers.get(sessionId);

    if (dispose) {
      dispose();
      this.participantDisposers.delete(sessionId);
    }
  }

  private logParticipantEvent(event: 'added' | 'changed' | 'removed', sessionId: string): void {
    if (isDev) {
      console.debug(`[NetworkClient] participant ${event} ${sessionId}`);
    }
  }

  private logShipEvent(event: 'added' | 'removed', shipId: string): void {
    if (isDev) {
      console.debug(`[NetworkClient] ship ${event} ${shipId}`);
    }
  }

  private upsertParticipant(participant: RoomParticipant, event: 'added' | 'changed'): void {
    const alreadyKnown = this.participants.has(participant.sessionId);
    this.participants.set(participant.sessionId, participant);
    const callbacks = event === 'added' && !alreadyKnown
      ? this.participantAddedCallbacks
      : this.participantChangedCallbacks;

    for (const callback of callbacks) {
      callback(participant);
    }
  }

  private clearParticipants(): void {
    const sessionIds = Array.from(this.participants.keys());
    this.participants.clear();
    this.clearParticipantChangeListeners();

    for (const sessionId of sessionIds) {
      for (const callback of this.participantRemovedCallbacks) {
        callback(sessionId);
      }
    }
  }

  private upsertShip(ship: ShipSnapshot, event: 'added' | 'changed'): void {
    const alreadyKnown = this.ships.has(ship.id);
    this.ships.set(ship.id, ship);

    if (ship.ownerSessionId === this.getSessionId()) {
      this.inputSequence = Math.max(this.inputSequence, ship.lastProcessedInput);
    }

    const callbacks = event === 'added' && !alreadyKnown
      ? this.shipAddedCallbacks
      : this.shipChangedCallbacks;

    for (const callback of callbacks) {
      callback(ship);
    }
  }

  private clearShips(): void {
    const shipIds = Array.from(this.ships.keys());
    this.ships.clear();
    this.clearShipChangeListeners();

    for (const shipId of shipIds) {
      for (const callback of this.shipRemovedCallbacks) {
        callback(shipId);
      }
    }
  }

  private upsertProjectile(projectile: ProjectileSnapshot, event: 'added' | 'changed'): void {
    const alreadyKnown = this.projectiles.has(projectile.id);
    this.projectiles.set(projectile.id, projectile);
    const callbacks = event === 'added' && !alreadyKnown
      ? this.projectileAddedCallbacks
      : this.projectileChangedCallbacks;

    for (const callback of callbacks) {
      callback(projectile);
    }
  }

  private clearProjectiles(): void {
    const projectileIds = Array.from(this.projectiles.keys());
    this.projectiles.clear();
    this.clearProjectileChangeListeners();

    for (const projectileId of projectileIds) {
      for (const callback of this.projectileRemovedCallbacks) {
        callback(projectileId);
      }
    }
  }

  private clearShipChangeListeners(): void {
    for (const dispose of this.shipDisposers.values()) {
      dispose();
    }

    this.shipDisposers.clear();
  }

  private clearProjectileChangeListeners(): void {
    for (const dispose of this.projectileDisposers.values()) {
      dispose();
    }

    this.projectileDisposers.clear();
  }

  private clearParticipantChangeListeners(): void {
    for (const dispose of this.participantDisposers.values()) {
      dispose();
    }

    this.participantDisposers.clear();
  }

  private clearRoomListeners(): void {
    for (const dispose of this.roomDisposers.splice(0)) {
      dispose();
    }

    this.clearParticipantChangeListeners();
    this.clearShipChangeListeners();
    this.clearProjectileChangeListeners();
    this.room?.removeAllListeners();
  }

  private setConnectionState(status: ConnectionStatus, error?: string, roomInfo = this.roomInfo): void {
    this.status = status;
    this.error = error;
    this.roomInfo = roomInfo;
    this.emitConnectionState();
  }

  private getConnectionState(): ConnectionState {
    return {
      status: this.status,
      error: this.error,
      profileError: this.profileError,
      roomInfo: this.roomInfo
    };
  }

  private emitConnectionState(): void {
    const state = this.getConnectionState();

    for (const callback of this.connectionCallbacks) {
      callback(state);
    }
  }
}
