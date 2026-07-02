import { schema, type SchemaType } from '@colyseus/schema';

export const ProjectileState = schema(
  {
    id: { type: 'string', default: '' },
    ownerSessionId: { type: 'string', default: '' },
    faction: { type: 'string', default: 'red' },
    x: { type: 'number', default: 0 },
    y: { type: 'number', default: 0 },
    previousX: { type: 'number', default: 0 },
    previousY: { type: 'number', default: 0 },
    velocityX: { type: 'number', default: 0 },
    velocityY: { type: 'number', default: 0 },
    rotation: { type: 'number', default: 0 },
    spawnX: { type: 'number', default: 0 },
    spawnY: { type: 'number', default: 0 },
    distanceTraveled: { type: 'number', default: 0 },
    active: { type: 'boolean', default: true },
    createdAt: { type: 'number', default: 0 }
  },
  'ProjectileState'
);

export type ProjectileState = SchemaType<typeof ProjectileState>;
