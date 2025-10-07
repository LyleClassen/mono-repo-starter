import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { registerRoutes } from '../src/routes/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateOpenAPISpec() {
  const fastify = Fastify({
    logger: false,
  });

  // Register OpenAPI plugin with same config as main app
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

  // Register all routes
  await registerRoutes(fastify);

  // Ready the application
  await fastify.ready();

  // Get OpenAPI spec
  const spec = fastify.swagger();

  // Ensure output directory exists
  const outputDir = join(__dirname, '..', 'openapi');
  await mkdir(outputDir, { recursive: true });

  // Write the OpenAPI spec JSON
  const jsonOutputPath = join(outputDir, 'openapi.json');
  await writeFile(jsonOutputPath, JSON.stringify(spec, null, 2));
  console.log(`✅ OpenAPI spec generated at: ${jsonOutputPath}`);

  // Generate Scalar HTML
  const scalarHTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Backend API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <script id="api-reference" data-url="./openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  const htmlOutputPath = join(outputDir, 'index.html');
  await writeFile(htmlOutputPath, scalarHTML);
  console.log(`✅ Scalar HTML generated at: ${htmlOutputPath}`);

  await fastify.close();
  process.exit(0);
}

generateOpenAPISpec().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
