import { FastifyPluginAsync } from 'fastify';
import { HealthResponseSchema, HealthResponse } from '../../schemas/health.schema.js';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: HealthResponse }>('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: HealthResponseSchema,
      },
    },
    handler: async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  });
};

export default healthRoutes;
