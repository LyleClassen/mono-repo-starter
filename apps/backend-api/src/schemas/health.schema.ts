import { Type, Static } from '@sinclair/typebox';

export const HealthResponseSchema = Type.Object({
  status: Type.String(),
  timestamp: Type.String({ format: 'date-time' }),
  uptime: Type.Number(),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;
