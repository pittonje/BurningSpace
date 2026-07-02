import { Client, Room, getStateCallbacks } from 'colyseus.js';
import type { MapSchema } from '@colyseus/schema';
import {
  ClientMessages,
  ServerMessages,
  type Faction,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomInfoMessage,
  type RoomParticipant
} from '@burningspace/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Unsubscribe = () => void;

interface ParticipantStateSchema {
  sessionId: string;
  nickname: string;
  mode: JoinMode;
  faction: '' | Faction;
  connectedAt: number;
  profileReady: boolean;
}

interface BattleStateSchema {
  participants: MapSchema<ParticipantStateSchema, string>;
  roomCreatedAt: number;
}

export interface ConnectionState {
  status: ConnectionStatus;
  error?: string;
  roomInfo?: RoomInfoMessage;
}

type StateCallbacks = ReturnType<typeof getStateCallbacks<BattleStateSchema>>;
type ParticipantCallback = (participant: RoomParticipant) => void;
type RemovedParticipantCallback = (sessionId: string) => void;
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

export class NetworkClient {
  private readonly client = new Client(getServerUrl());
  private room?: Room<BattleStateSchema>;
  private status: ConnectionStatus = 'disconnected';
  private error?: string;
  private roomInfo?: RoomInfoMessage;
  private connectingPromise?: Promise<void>;
  private readonly participants = new Map<string, RoomParticipant>();
  private readonly participantAddedCallbacks = new Set<ParticipantCallback>();
  private readonly participantChangedCallbacks = new Set<ParticipantCallback>();
  private readonly participantRemovedCallbacks = new Set<RemovedParticipantCallback>();
  private readonly connectionCallbacks = new Set<ConnectionStateCallback>();
  private readonly roomDisposers: Unsubscribe[] = [];
  private readonly participantDisposers = new Map<string, Unsubscribe>();

  get currentParticipants(): RoomParticipant[] {
    return Array.from(this.participants.values()).sort((left, right) => left.connectedAt - right.connectedAt);
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

    this.room.send(ClientMessages.SET_PROFILE, profile);
  }

  async disconnect(): Promise<void> {
    const room = this.room;

    this.clearRoomListeners();
    this.room = undefined;
    this.roomInfo = undefined;
    this.clearParticipants();

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

  onConnectionStateChanged(callback: ConnectionStateCallback): Unsubscribe {
    this.connectionCallbacks.add(callback);
    callback(this.getConnectionState());
    return () => this.connectionCallbacks.delete(callback);
  }

  private async connectInternal(): Promise<void> {
    try {
      const room = await this.client.joinOrCreate<BattleStateSchema>('battle');
      this.room = room;
      this.registerRoomListeners(room);
      this.registerParticipantListeners(room);
      this.setConnectionState('connected');
    } catch (error) {
      this.room = undefined;
      this.clearRoomListeners();
      this.clearParticipants();
      this.setConnectionState('error', error instanceof Error ? error.message : 'Connection failed.');
    }
  }

  private registerRoomListeners(room: Room<BattleStateSchema>): void {
    room.onMessage<ProfileAcceptedMessage>(ServerMessages.PROFILE_ACCEPTED, () => {
      this.setConnectionState('connected', undefined, this.roomInfo);
    });

    room.onMessage<ProfileRejectedMessage>(ServerMessages.PROFILE_REJECTED, (message) => {
      this.setConnectionState('error', message.reason, this.roomInfo);
    });

    room.onMessage<RoomInfoMessage>(ServerMessages.ROOM_INFO, (message) => {
      this.roomInfo = message;
      this.emitConnectionState();
    });

    room.onError((code, message) => {
      this.setConnectionState('error', message ?? `Room error ${code}.`, this.roomInfo);
    });

    room.onLeave((code) => {
      this.clearRoomListeners();
      this.room = undefined;
      this.roomInfo = undefined;
      this.clearParticipants();
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
