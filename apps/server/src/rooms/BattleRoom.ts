import { Client, Room } from 'colyseus';
import {
  ClientMessages,
  MAX_ROOM_CLIENTS,
  NETWORK_TICK_INTERVAL_MS,
  ServerMessages,
  type Faction,
  type JoinMode,
  type JoinRequest,
  type PlayerInputMessage,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomInfoMessage
} from '@burningspace/shared';
import { BattleState } from '../schema/BattleState.js';
import { ParticipantState } from '../schema/ParticipantState.js';
import { ShipState } from '../schema/ShipState.js';
import { getFactionSpawnPosition } from '../systems/spawn.js';
import { simulateShipMovement } from '../systems/shipMovement.js';
import { validateNickname } from '../validation/nickname.js';
import { createNeutralInput, validatePlayerInputMessage } from '../validation/playerInput.js';

type ProfileValidationResult =
  | { ok: true; profile: Required<Pick<JoinRequest, 'nickname' | 'mode'>> & { faction?: Faction } }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProfile(message: unknown): ProfileValidationResult {
  if (!isRecord(message)) {
    return { ok: false, reason: 'Profile payload must be an object.' };
  }

  const nicknameResult = validateNickname(message.nickname);

  if (!nicknameResult.ok) {
    return nicknameResult;
  }

  if (message.mode !== 'player' && message.mode !== 'spectator') {
    return { ok: false, reason: 'Mode must be player or spectator.' };
  }

  const mode = message.mode;
  const faction = message.faction;

  if (mode === 'player' && faction !== 'red' && faction !== 'blue') {
    return { ok: false, reason: 'Player faction must be red or blue.' };
  }

  if (mode === 'spectator' && faction !== undefined && faction !== 'red' && faction !== 'blue') {
    return { ok: false, reason: 'Spectator faction must be empty, red or blue.' };
  }

  const normalizedFaction = faction === 'red' || faction === 'blue' ? faction : undefined;

  return {
    ok: true,
    profile: {
      nickname: nicknameResult.nickname,
      mode,
      faction: mode === 'player' ? normalizedFaction : undefined
    }
  };
}

export class BattleRoom extends Room<BattleState> {
  maxClients = MAX_ROOM_CLIENTS;
  private readonly inputs = new Map<string, PlayerInputMessage>();
  private readonly lastInputReceivedAt = new Map<string, number>();

  onCreate(): void {
    this.setState(new BattleState());
    this.onMessage<unknown>(ClientMessages.SET_PROFILE, (client, message) => {
      this.handleSetProfile(client, message);
    });
    this.onMessage<unknown>(ClientMessages.PLAYER_INPUT, (client, message) => {
      this.handlePlayerInput(client, message);
    });
    this.setSimulationInterval((deltaTimeMs) => {
      this.updateSimulation(deltaTimeMs);
    }, NETWORK_TICK_INTERVAL_MS);

    console.log(`[BattleRoom] created roomId=${this.roomId}`);
  }

  onJoin(client: Client): void {
    const participant = new ParticipantState();
    participant.sessionId = client.sessionId;
    participant.nickname = `Guest-${client.sessionId.slice(0, 4)}`;
    participant.mode = 'spectator';
    participant.faction = '';
    participant.connectedAt = Date.now();
    participant.profileReady = false;

    this.state.participants.set(client.sessionId, participant);
    this.sendRoomInfo();

    console.log(`[BattleRoom] joined sessionId=${client.sessionId}`);
  }

  onLeave(client: Client, consented?: boolean): void {
    this.state.participants.delete(client.sessionId);
    this.removeShip(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.lastInputReceivedAt.delete(client.sessionId);
    this.sendRoomInfo();

    console.log(`[BattleRoom] left sessionId=${client.sessionId} consented=${Boolean(consented)}`);
  }

  private handleSetProfile(client: Client, message: unknown): void {
    const participant = this.state.participants.get(client.sessionId);

    if (!participant) {
      client.send(ServerMessages.PROFILE_REJECTED, {
        reason: 'Participant was not found.'
      } satisfies ProfileRejectedMessage);
      return;
    }

    const validation = validateProfile(message);

    if (!validation.ok) {
      client.send(ServerMessages.PROFILE_REJECTED, {
        reason: validation.reason
      } satisfies ProfileRejectedMessage);
      return;
    }

    participant.nickname = validation.profile.nickname;
    participant.mode = validation.profile.mode;
    participant.faction = validation.profile.faction ?? '';
    participant.profileReady = true;

    if (validation.profile.mode === 'player' && validation.profile.faction) {
      this.upsertShip(client.sessionId, validation.profile.nickname, validation.profile.faction);
    } else {
      this.removeShip(client.sessionId);
      this.inputs.delete(client.sessionId);
    }

    client.send(ServerMessages.PROFILE_ACCEPTED, {
      sessionId: participant.sessionId,
      nickname: participant.nickname,
      mode: participant.mode as JoinMode,
      faction: participant.faction === '' ? undefined : (participant.faction as Faction),
      connectedAt: participant.connectedAt
    } satisfies ProfileAcceptedMessage);

    this.sendRoomInfo();

    console.log(
      `[BattleRoom] profile sessionId=${client.sessionId} nickname=${participant.nickname} mode=${participant.mode}`
    );
  }

  private sendRoomInfo(): void {
    this.broadcast(ServerMessages.ROOM_INFO, {
      roomId: this.roomId,
      connectedClients: this.clients.length,
      maxClients: this.maxClients
    } satisfies RoomInfoMessage);
  }

  private upsertShip(sessionId: string, nickname: string, faction: Faction): void {
    const existingShip = this.state.ships.get(sessionId);

    if (existingShip && existingShip.faction === faction) {
      existingShip.nickname = nickname;
      existingShip.active = true;
      return;
    }

    if (existingShip && existingShip.faction !== faction) {
      console.log(`[BattleRoom] ship faction changed sessionId=${sessionId} faction=${faction}`);
    }

    const spawn = getFactionSpawnPosition(faction, sessionId);
    const ship = existingShip ?? new ShipState();
    ship.id = sessionId;
    ship.ownerSessionId = sessionId;
    ship.nickname = nickname;
    ship.faction = faction;
    ship.x = spawn.x;
    ship.y = spawn.y;
    ship.rotation = spawn.rotation;
    ship.velocityX = 0;
    ship.velocityY = 0;
    ship.lastProcessedInput = 0;
    ship.active = true;

    this.state.ships.set(sessionId, ship);
    this.inputs.set(sessionId, createNeutralInput());

    if (!existingShip) {
      console.log(`[BattleRoom] ship created sessionId=${sessionId} faction=${faction}`);
    }
  }

  private removeShip(sessionId: string): void {
    if (!this.state.ships.has(sessionId)) {
      return;
    }

    this.state.ships.delete(sessionId);
    this.inputs.delete(sessionId);
    console.log(`[BattleRoom] ship removed sessionId=${sessionId}`);
  }

  private handlePlayerInput(client: Client, message: unknown): void {
    if (!this.state.ships.has(client.sessionId)) {
      return;
    }

    const participant = this.state.participants.get(client.sessionId);

    if (!participant || participant.mode !== 'player') {
      return;
    }

    const now = Date.now();
    const lastReceivedAt = this.lastInputReceivedAt.get(client.sessionId) ?? 0;

    if (now - lastReceivedAt < 10) {
      return;
    }

    const previousSequence = this.inputs.get(client.sessionId)?.sequence ?? 0;
    const validation = validatePlayerInputMessage(message, previousSequence);

    if (!validation.ok) {
      return;
    }

    this.lastInputReceivedAt.set(client.sessionId, now);
    this.inputs.set(client.sessionId, validation.input);
  }

  private updateSimulation(deltaTimeMs: number): void {
    const deltaSeconds = Math.min(deltaTimeMs / 1000, 0.1);

    this.state.ships.forEach((ship, sessionId) => {
      if (!ship.active) {
        return;
      }

      const input = this.inputs.get(sessionId) ?? createNeutralInput(ship.lastProcessedInput);
      simulateShipMovement(ship, input, deltaSeconds);
    });
  }
}
