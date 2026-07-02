import { schema, type SchemaType } from '@colyseus/schema';

export const ParticipantState = schema(
  {
    sessionId: { type: 'string', default: '' },
    nickname: { type: 'string', default: 'Guest' },
    mode: { type: 'string', default: 'spectator' },
    faction: { type: 'string', default: '' },
    connectedAt: { type: 'number', default: 0 },
    profileReady: { type: 'boolean', default: false }
  },
  'ParticipantState'
);

export type ParticipantState = SchemaType<typeof ParticipantState>;
