import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { registerRoutes } from '../src/routes/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateOpenAPISpec() {
  const fastify = Fastify({
    logger: false,
  });

  // Register Swagger with same config as main app
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
      ],
    },
  });

  // Register all routes
  await registerRoutes(fastify);

  // Ready the application
  await fastify.ready();

  // Get OpenAPI spec
  const spec = fastify.swagger();

  // Ensure output directory exists
  const outputDir = join(__dirname, '..', 'openapi');
  await mkdir(outputDir, { recursive: true });

  // Write the spec to a file
  const outputPath = join(outputDir, 'openapi.json');
  await writeFile(outputPath, JSON.stringify(spec, null, 2));

  console.log(`✅ OpenAPI spec generated at: ${outputPath}`);

  await fastify.close();
  process.exit(0);
}

generateOpenAPISpec().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
