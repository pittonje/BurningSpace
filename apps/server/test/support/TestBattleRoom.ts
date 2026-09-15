import { Client } from 'colyseus';
import {
  NETWORK_SHIP_MAX_HEALTH,
  NETWORK_SHIP_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Faction
} from '@burningspace/shared';
import { BattleRoom } from '../../src/rooms/BattleRoom.js';

export const TestRoomMessages = {
  SET_SHIP_STATE: 'test:setShipState',
  FORCE_UPSERT_SHIP_FAILURE_ONCE: 'test:forceUpsertShipFailureOnce'
} as const;

interface TestSetShipStateMessage {
  targetSessionId: string;
  x?: number;
  y?: number;
  rotation?: number;
  health?: number;
  invulnerableUntil?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTestSetShipStateMessage(value: unknown): value is TestSetShipStateMessage {
  return (
    isRecord(value) &&
    typeof value.targetSessionId === 'string' &&
    (value.x === undefined || isFiniteNumber(value.x)) &&
    (value.y === undefined || isFiniteNumber(value.y)) &&
    (value.rotation === undefined || isFiniteNumber(value.rotation)) &&
    (value.health === undefined || isFiniteNumber(value.health)) &&
    (value.invulnerableUntil === undefined || isFiniteNumber(value.invulnerableUntil))
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class TestBattleRoom extends BattleRoom {
  private forceNextUpsertShipFailure = false;

  override onCreate(): void {
    super.onCreate();
    this.onMessage<unknown>(TestRoomMessages.SET_SHIP_STATE, (_client: Client, message) => {
      this.handleSetShipState(message);
    });
    this.onMessage<unknown>(TestRoomMessages.FORCE_UPSERT_SHIP_FAILURE_ONCE, (_client: Client) => {
      this.forceUpsertShipFailureOnce();
    });
  }

  /**
   * Test-only deterministic seam for the spawn-failure compensation
   * scenario (PERSIST-002 Packet 6): the NEXT call to upsertShip() throws
   * instead of creating/updating the ship, simulating a transient failure
   * AFTER the durable profile transaction has already committed.
   * Production BattleRoom is never affected -- this only exists on this
   * test-only subclass.
   */
  forceUpsertShipFailureOnce(): void {
    this.forceNextUpsertShipFailure = true;
  }

  protected override upsertShip(sessionId: string, nickname: string, faction: Faction): void {
    if (this.forceNextUpsertShipFailure) {
      this.forceNextUpsertShipFailure = false;
      throw new Error('Synthetic ship spawn failure for test.');
    }
    super.upsertShip(sessionId, nickname, faction);
  }

  private handleSetShipState(message: unknown): void {
    if (!isTestSetShipStateMessage(message)) {
      return;
    }

    const ship = this.state.ships.get(message.targetSessionId);

    if (!ship) {
      return;
    }

    if (message.x !== undefined) {
      ship.x = clamp(message.x, NETWORK_SHIP_RADIUS, WORLD_WIDTH - NETWORK_SHIP_RADIUS);
    }

    if (message.y !== undefined) {
      ship.y = clamp(message.y, NETWORK_SHIP_RADIUS, WORLD_HEIGHT - NETWORK_SHIP_RADIUS);
    }

    if (message.rotation !== undefined) {
      ship.rotation = message.rotation;
    }

    if (message.health !== undefined) {
      ship.health = clamp(message.health, 0, NETWORK_SHIP_MAX_HEALTH);
    }

    if (message.invulnerableUntil !== undefined) {
      ship.invulnerableUntil = message.invulnerableUntil;
    }

    ship.velocityX = 0;
    ship.velocityY = 0;
  }
}
