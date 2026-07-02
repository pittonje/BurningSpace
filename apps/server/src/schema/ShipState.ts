import { schema, type SchemaType } from '@colyseus/schema';

export const ShipState = schema(
  {
    id: { type: 'string', default: '' },
    ownerSessionId: { type: 'string', default: '' },
    nickname: { type: 'string', default: '' },
    faction: { type: 'string', default: 'red' },
    x: { type: 'number', default: 0 },
    y: { type: 'number', default: 0 },
    rotation: { type: 'number', default: 0 },
    velocityX: { type: 'number', default: 0 },
    velocityY: { type: 'number', default: 0 },
    lastProcessedInput: { type: 'number', default: 0 },
    active: { type: 'boolean', default: true },
    health: { type: 'number', default: 100 },
    maxHealth: { type: 'number', default: 100 },
    alive: { type: 'boolean', default: true },
    respawnAt: { type: 'number', default: 0 },
    invulnerableUntil: { type: 'number', default: 0 },
    lastDamageAt: { type: 'number', default: 0 }
  },
  'ShipState'
);

export type ShipState = SchemaType<typeof ShipState>;
