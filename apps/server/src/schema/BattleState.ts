import { schema, type SchemaType } from '@colyseus/schema';
import { ParticipantState } from './ParticipantState.js';

export const BattleState = schema(
  {
    participants: { map: ParticipantState },
    roomCreatedAt: { type: 'number', default: Date.now() }
  },
  'BattleState'
);

export type BattleState = SchemaType<typeof BattleState>;
