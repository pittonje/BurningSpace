import { schema, type SchemaType } from '@colyseus/schema';
import { ParticipantState } from './ParticipantState.js';
import { ShipState } from './ShipState.js';

export const BattleState = schema(
  {
    participants: { map: ParticipantState },
    ships: { map: ShipState },
    roomCreatedAt: { type: 'number', default: Date.now() }
  },
  'BattleState'
);

export type BattleState = SchemaType<typeof BattleState>;
