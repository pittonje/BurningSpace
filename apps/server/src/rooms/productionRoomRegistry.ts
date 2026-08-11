import { BattleRoom } from './BattleRoom.js';

export interface ProductionRoomRegistrar {
  define(name: string, room: typeof BattleRoom): unknown;
}

export const productionRoomDefinitions = Object.freeze([
  Object.freeze({
    name: 'battle',
    room: BattleRoom
  })
] as const);

export function registerProductionRooms(registrar: ProductionRoomRegistrar): void {
  for (const definition of productionRoomDefinitions) {
    registrar.define(definition.name, definition.room);
  }
}
