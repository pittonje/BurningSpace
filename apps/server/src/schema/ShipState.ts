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
    active: { type: 'boolean', default: true }
  },
  'ShipState'
);

export type ShipState = SchemaType<typeof ShipState>;
