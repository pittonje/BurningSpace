import { describe, expect, it } from 'vitest';
import { BattleRoom } from '../src/rooms/BattleRoom.js';
import {
  productionRoomDefinitions,
  registerProductionRooms,
  type ProductionRoomRegistrar
} from '../src/rooms/productionRoomRegistry.js';
import { TestBattleRoom } from './support/TestBattleRoom.js';

describe('production room registry', () => {
  it('exposes only the explicitly approved battle room', () => {
    expect(productionRoomDefinitions.map(({ name }) => name)).toEqual(['battle']);
    expect(productionRoomDefinitions.map(({ room }) => room)).toEqual([BattleRoom]);
  });

  it('registers battle exactly once with the production BattleRoom constructor', () => {
    const registrations: Array<{ name: string; room: typeof BattleRoom }> = [];
    const registrar: ProductionRoomRegistrar = {
      define(name, room) {
        registrations.push({ name, room });
      }
    };

    registerProductionRooms(registrar);

    expect(registrations).toEqual([{ name: 'battle', room: BattleRoom }]);
  });

  it('excludes test support and diagnostic room names from production definitions', () => {
    const diagnosticNamePattern = /test|diagnostic|debug|sandbox/i;

    expect(productionRoomDefinitions.map(({ room }) => room)).not.toContain(TestBattleRoom);
    expect(
      productionRoomDefinitions.some(({ name }) => diagnosticNamePattern.test(name))
    ).toBe(false);
  });
});
