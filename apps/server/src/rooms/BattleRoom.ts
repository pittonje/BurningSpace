import { Client, Room } from 'colyseus';
import {
  ClientMessages,
  MAX_ROOM_CLIENTS,
  ServerMessages,
  type Faction,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomInfoMessage
} from '@burningspace/shared';
import { BattleState } from '../schema/BattleState.js';
import { ParticipantState } from '../schema/ParticipantState.js';
import { validateNickname } from '../validation/nickname.js';

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

  onCreate(): void {
    this.setState(new BattleState());
    this.onMessage<unknown>(ClientMessages.SET_PROFILE, (client, message) => {
      this.handleSetProfile(client, message);
    });

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
}
