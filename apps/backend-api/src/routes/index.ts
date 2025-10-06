import { FastifyInstance } from 'fastify';
import healthRoutes from './health/index.js';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
}
