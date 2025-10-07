# Backend API

Fastify-based REST API with OpenAPI specification.

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm generate:openapi` - Generate OpenAPI specification file

## API Documentation

Once the server is running, visit:
- **API Docs**: http://localhost:3001/docs
- **OpenAPI Spec**: Available at `/openapi/openapi.json`

## Using the OpenAPI Spec

For API consumers to get TypeScript types from the OpenAPI spec:

### Option 1: Direct Import (Recommended for mono-repo)

Install openapi-typescript in your consuming app:

```bash
pnpm add -D openapi-typescript openapi-fetch
```

Generate types from the spec:

```bash
npx openapi-typescript ../backend-api/openapi/openapi.json -o ./src/types/api.d.ts
```

Use in your code:

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './types/api';

const client = createClient<paths>({ baseUrl: 'http://localhost:3001' });

const { data, error } = await client.GET('/health');
// data is fully typed!
```

### Option 2: Shared Package

Create a shared package that exports the OpenAPI spec and types for multiple consumers.

## Project Structure

```
src/
├── routes/          # Route handlers organized by domain
│   ├── health/      # Health check routes
│   └── index.ts     # Route registration
├── schemas/         # TypeBox schemas for validation & types
└── index.ts         # Application entry point
scripts/
└── generate-openapi.ts  # OpenAPI spec generator
openapi/
└── openapi.json     # Generated OpenAPI specification
```

## Adding New Routes

1. Create a new folder in `src/routes/` (e.g., `users/`)
2. Create schemas in `src/schemas/` using TypeBox
3. Create route handler as a Fastify plugin
4. Register in `src/routes/index.ts`
5. Run `pnpm generate:openapi` to update the spec
