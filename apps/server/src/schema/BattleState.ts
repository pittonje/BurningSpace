import { schema, type SchemaType } from '@colyseus/schema';
import { ParticipantState } from './ParticipantState.js';
import { ProjectileState } from './ProjectileState.js';
import { ShipState } from './ShipState.js';

export const BattleState = schema(
  {
    participants: { map: ParticipantState },
    ships: { map: ShipState },
    projectiles: { map: ProjectileState },
    roomCreatedAt: { type: 'number', default: Date.now() }
  },
  'BattleState'
);

export type BattleState = SchemaType<typeof BattleState>;
