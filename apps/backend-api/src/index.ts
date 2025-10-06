import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { registerRoutes } from './routes/index.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

const fastify = Fastify({
  logger: isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
            colorize: true,
            singleLine: false,
            levelFirst: true,
          },
        },
      }
    : true,
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
});

// Register Swagger
await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      description: 'Fastify backend API documentation',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'health', description: 'Health check endpoints' },
      { name: 'people', description: 'People CRUD operations' },
    ],
  },
});

// Register Swagger UI
await fastify.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
});

// Add logging hooks for better visibility
fastify.addHook('onRequest', async (request, reply) => {
  const method = request.method;
  const url = request.url;

  let emoji = '📥';
  if (method === 'GET') emoji = '🔍';
  if (method === 'POST') emoji = '✍️';
  if (method === 'PUT') emoji = '📝';
  if (method === 'DELETE') emoji = '🗑️';

  request.log.info(`${emoji} ${method} ${url}`);
});

fastify.addHook('onResponse', async (request, reply) => {
  const statusCode = reply.statusCode;
  const responseTime = reply.elapsedTime.toFixed(2);

  let emoji = '✅';
  if (statusCode >= 400 && statusCode < 500) emoji = '⚠️';
  if (statusCode >= 500) emoji = '❌';

  request.log.info(`${emoji} ${statusCode} (${responseTime}ms)`);
});

// Register all routes
await registerRoutes(fastify);

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    await fastify.listen({ port, host: '0.0.0.0' });

    // Pretty startup messages
    console.log('\n🚀 Server started successfully!\n');
    console.log(`   ✨ API Server:    http://localhost:${port}`);
    console.log(`   📚 Swagger Docs:  http://localhost:${port}/docs`);
    console.log(`   🔧 Environment:   ${process.env.NODE_ENV || 'development'}`);
    console.log(`   🕐 Started at:    ${new Date().toLocaleString()}\n`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
