# Enterprise Monorepo Starter

A production-ready, full-stack TypeScript monorepo starter template designed for enterprise-level applications. Built with modern technologies and best practices, this starter provides a solid foundation for scalable web applications.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Database Management](#database-management)
- [Backend API Development](#backend-api-development)
- [Frontend Development](#frontend-development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Architectural Patterns](#architectural-patterns)
- [Project Specification Kit](#project-specification-kit)

## Technology Stack

### Core Technologies
- **Language**: TypeScript 5.x
- **Package Manager**: pnpm (monorepo workspace)
- **Runtime**: Node.js 22 (Alpine)
- **Containerization**: Docker & Docker Compose

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS 4
- **Build Tool**: Turbopack
- **Type-Safe API Client**: openapi-fetch

### Backend
- **Framework**: Fastify 5
- **Validation**: TypeBox (JSON Schema)
- **API Documentation**: Swagger/OpenAPI 3.0
- **CORS**: @fastify/cors
- **Logging**: Pino with pino-pretty (colorized, emoji-enhanced)

### Database
- **Database**: PostgreSQL 18 (Alpine)
- **ORM**: Drizzle ORM 0.44+
- **Migration Tool**: Drizzle Kit
- **Query Builder**: postgres-js

### Development Tools
- **Hot Reload**: tsx (TypeScript execution)
- **Type Generation**: openapi-typescript
- **Code Quality**: ESLint
- **Git**: Pre-configured for monorepo

## Project Structure

```
mono-repo-starter/
├── apps/
│   ├── backend-api/          # Fastify REST API
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   └── index.ts      # Application entry point
│   │   ├── openapi/          # Generated OpenAPI specs
│   │   ├── scripts/          # Build & generation scripts
│   │   ├── Dockerfile.dev    # Development container
│   │   └── Dockerfile.prod   # Production container
│   │
│   └── web-client/           # Next.js application
│       ├── src/
│       │   ├── app/          # Next.js app router
│       │   ├── components/   # React components
│       │   └── lib/          # Utilities & API client
│       ├── Dockerfile.dev
│       └── Dockerfile.prod
│
├── packages/
│   └── database/             # Shared database package
│       ├── src/
│       │   ├── schema/       # Drizzle table schemas
│       │   ├── repositories/ # Data Access Objects (DAOs)
│       │   ├── schemas/      # TypeBox validation schemas
│       │   ├── migrations/   # Database migrations
│       │   ├── client.ts     # Database connection
│       │   ├── init.ts       # Auto-initialization
│       │   └── seed.ts       # Seed data
│       └── drizzle.config.ts
│
├── docker-compose.dev.yml    # Development environment
├── docker-compose.prod.yml   # Production environment
├── .env.dev                  # Development environment variables
├── .env.prod                 # Production environment variables
└── pnpm-workspace.yaml       # Workspace configuration
```

## Getting Started

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Node.js 22+ (for local type generation)
- pnpm 10+ (optional, for local development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mono-repo-starter
   ```

2. **Start development environment**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

   This will:
   - Start PostgreSQL 18 database
   - Run database migrations automatically
   - Seed the database with mock data (if empty)
   - Start the backend API on http://localhost:3001
   - Start the web client on http://localhost:3000

3. **Access the applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/docs

4. **Stop the environment**
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

### Production Deployment

1. **Update production environment variables**
   - Edit `.env.prod` with your production values
   - Set secure database passwords
   - Configure CORS origins
   - Update API URLs

2. **Deploy with production compose**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## Development Workflow

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start PostgreSQL** (via Docker or local installation)
   ```bash
   docker run -d \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=app_db \
     -p 5432:5432 \
     postgres:18-alpine
   ```

3. **Set environment variables**
   ```bash
   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db
   ```

4. **Generate migrations and seed database**
   ```bash
   cd packages/database
   pnpm db:generate
   pnpm db:init
   ```

5. **Start backend API**
   ```bash
   cd apps/backend-api
   pnpm dev
   ```

6. **Start web client** (in a new terminal)
   ```bash
   cd apps/web-client
   pnpm dev
   ```

### Rebuilding Containers

After code changes, rebuild containers:

```bash
# Rebuild specific service
docker compose -f docker-compose.dev.yml up -d --build backend-api

# Rebuild all services
docker compose -f docker-compose.dev.yml up -d --build
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker logs mono-repo-starter-backend-api-1 -f
```

## Database Management

This project uses **Drizzle ORM** with a **DAO (Data Access Object)** pattern for clean separation of concerns.

### Database Architecture

- **Schema Definition**: Drizzle schema files in `packages/database/src/schema/`
- **Validation Schemas**: TypeBox schemas in `packages/database/src/schemas/`
- **Data Access Layer**: DAO classes in `packages/database/src/repositories/`
- **Migrations**: Auto-generated in `packages/database/src/migrations/`

### Creating a New Table

1. **Define the Drizzle schema** (`packages/database/src/schema/users.ts`)
   ```typescript
   import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

   export const users = pgTable('users', {
     id: uuid('id').primaryKey().defaultRandom(),
     username: varchar('username', { length: 100 }).notNull().unique(),
     email: varchar('email', { length: 255 }).notNull().unique(),
     createdAt: timestamp('created_at').notNull().defaultNow(),
     updatedAt: timestamp('updated_at').notNull().defaultNow(),
   });

   export type User = typeof users.$inferSelect;
   export type NewUser = typeof users.$inferInsert;
   ```

2. **Export the table** in `packages/database/src/schema/index.ts`
   ```typescript
   export * from './users.js';
   ```

3. **Create TypeBox validation schemas** (`packages/database/src/schemas/users.schema.ts`)
   ```typescript
   import { Type, Static } from '@sinclair/typebox';

   export const UserSchema = Type.Object({
     id: Type.String({ format: 'uuid' }),
     username: Type.String(),
     email: Type.String({ format: 'email' }),
     createdAt: Type.String({ format: 'date-time' }),
     updatedAt: Type.String({ format: 'date-time' }),
   });

   export const CreateUserSchema = Type.Object({
     username: Type.String({ minLength: 3, maxLength: 100 }),
     email: Type.String({ format: 'email', maxLength: 255 }),
   });

   export type UserDTO = Static<typeof UserSchema>;
   export type CreateUserDTO = Static<typeof CreateUserSchema>;
   ```

4. **Create a DAO** (`packages/database/src/repositories/users.dao.ts`)
   ```typescript
   import { eq } from 'drizzle-orm';
   import { db } from '../client.js';
   import { users, type User, type NewUser } from '../schema/index.js';

   export class UsersDAO {
     async findAll(): Promise<User[]> {
       return db.select().from(users);
     }

     async findById(id: string): Promise<User | null> {
       const result = await db.select().from(users).where(eq(users.id, id));
       return result[0] ?? null;
     }

     async create(data: NewUser): Promise<User> {
       const [user] = await db.insert(users).values(data).returning();
       return user;
     }
   }

   export const usersDAO = new UsersDAO();
   ```

5. **Export from database package** (`packages/database/src/index.ts`)
   ```typescript
   export * from './repositories/users.dao.js';
   export * from './schemas/users.schema.js';
   ```

6. **Generate migration**
   ```bash
   cd packages/database
   pnpm db:generate
   ```

7. **Apply migration** (automatic on container restart, or manual)
   ```bash
   pnpm db:migrate
   ```

### Running Migrations

Migrations are handled automatically by the `init.ts` script that runs on container startup. However, you can also run them manually:

```bash
# Inside container
docker exec -it mono-repo-starter-backend-api-1 sh
cd /app/packages/database
pnpm db:migrate

# Or locally
cd packages/database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db pnpm db:migrate
```

### Seeding Data

Add seed logic to `packages/database/src/seed.ts`:

```typescript
export async function seed() {
  await db.insert(users).values([
    { username: 'alice', email: 'alice@example.com' },
    { username: 'bob', email: 'bob@example.com' },
  ]);
}
```

Run seeding:
```bash
pnpm db:seed
```

### Drizzle Studio (Database GUI)

View and edit your database using Drizzle Studio:

```bash
cd packages/database
pnpm db:studio
```

Access at http://localhost:4983

## Backend API Development

### Creating New Routes

1. **Create route file** (`apps/backend-api/src/routes/users/index.ts`)
   ```typescript
   import { FastifyPluginAsync } from 'fastify';
   import {
     usersDAO,
     UserSchema,
     CreateUserSchema,
     type CreateUserDTO
   } from '@repo/database';

   const usersRoutes: FastifyPluginAsync = async (fastify) => {
     // GET /users
     fastify.get('/users', {
       schema: {
         description: 'Get all users',
         tags: ['users'],
         response: {
           200: Type.Array(UserSchema),
         },
       },
       handler: async (request, reply) => {
         return usersDAO.findAll();
       },
     });

     // POST /users
     fastify.post<{ Body: CreateUserDTO }>('/users', {
       schema: {
         description: 'Create a new user',
         tags: ['users'],
         body: CreateUserSchema,
         response: {
           201: UserSchema,
         },
       },
       handler: async (request, reply) => {
         const user = await usersDAO.create(request.body);
         reply.code(201);
         return user;
       },
     });
   };

   export default usersRoutes;
   ```

2. **Register route** in `apps/backend-api/src/routes/index.ts`
   ```typescript
   import usersRoutes from './users/index.js';

   export async function registerRoutes(fastify: FastifyInstance) {
     await fastify.register(healthRoutes);
     await fastify.register(peopleRoutes);
     await fastify.register(usersRoutes); // Add this
   }
   ```

3. **Restart backend**
   ```bash
   docker compose -f docker-compose.dev.yml restart backend-api
   ```

### Environment Variables

Backend environment variables are configured in `.env.dev` and `.env.prod`:

- `PORT`: API server port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGIN`: Comma-separated allowed origins

### Error Handling

Use consistent error responses:

```typescript
if (!user) {
  reply.code(404);
  return {
    error: 'Not Found',
    message: `User with id ${id} not found`,
  };
}
```

## Frontend Development

### Using Type-Safe API Client

1. **Generate OpenAPI spec** (from backend)
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db pnpm generate:openapi
   ```

2. **Generate TypeScript types** (in web-client)
   ```bash
   cd apps/web-client
   pnpm generate:types
   ```

3. **Use the API client**
   ```typescript
   import { apiClient } from '@/lib/api/client';
   import type { paths } from '@/lib/api/schema';

   // Type-safe API call
   const { data, error } = await apiClient.GET('/users', {
     params: {
       query: { limit: 10 },
     },
   });

   if (data) {
     console.log(data); // Fully typed!
   }
   ```

### Creating Components

Components should be placed in `apps/web-client/src/components/`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await apiClient.GET('/users');
      if (data) setUsers(data);
    }
    fetchUsers();
  }, []);

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
    </div>
  );
}
```

### Environment Variables

Frontend environment variables must be prefixed with `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Documentation

### OpenAPI with Scalar

API documentation is auto-generated from route schemas and served as a static Scalar site at:
- Development: http://localhost:3001/docs
- Production: https://your-api.com/docs

### Generating OpenAPI Spec and Documentation

```bash
cd apps/backend-api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db pnpm generate:openapi
```

This generates:
- `apps/backend-api/openapi/openapi.json` - OpenAPI specification
- `apps/backend-api/openapi/index.html` - Scalar static documentation

The OpenAPI spec is used by:
- Scalar for interactive API documentation with "try it out" functionality
- `openapi-typescript` to generate TypeScript types for frontend

### Documenting Routes

Use comprehensive schema definitions:

```typescript
fastify.get('/users/:id', {
  schema: {
    description: 'Get a user by ID',
    tags: ['users'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' }),
    }),
    response: {
      200: UserSchema,
      404: ErrorResponseSchema,
    },
  },
  handler: async (request, reply) => {
    // Implementation
  },
});
```

### API Tags

Organize endpoints with tags (configured in `apps/backend-api/src/index.ts`):

```typescript
tags: [
  { name: 'health', description: 'Health check endpoints' },
  { name: 'users', description: 'User management' },
  { name: 'people', description: 'People CRUD operations' },
]
```

## Deployment

### Environment Configuration

1. **Update `.env.prod`**:
   - Change `POSTGRES_PASSWORD` to a strong password
   - Update `CORS_ORIGIN` to your production domain
   - Set `NEXT_PUBLIC_API_URL` to your production API URL

2. **Security Checklist**:
   - [ ] Strong database passwords
   - [ ] HTTPS enabled (configure reverse proxy)
   - [ ] CORS properly configured
   - [ ] Environment secrets not committed to git
   - [ ] Database backups configured

### Docker Compose Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

### CI/CD Considerations

- Build Docker images in CI pipeline
- Run database migrations before deployment
- Use health checks to verify deployment
- Implement zero-downtime deployments

## Architectural Patterns

### DAO (Data Access Object) Pattern

**Purpose**: Separate database logic from business logic

**Benefits**:
- Single source of truth for data access
- Easier testing (mock DAOs)
- Consistent error handling
- Database agnostic (swap ORMs easily)

**Implementation**:
```
Backend Route → DAO → Database
```

Never import Drizzle directly in routes. Always use DAOs.

### Schema Separation

**Drizzle Schemas**: Define database structure
```typescript
// packages/database/src/schema/people.ts
export const people = pgTable('people', { ... });
```

**TypeBox Schemas**: Define API validation & documentation
```typescript
// packages/database/src/schemas/people.schema.ts
export const CreatePersonSchema = Type.Object({ ... });
```

**Why?** Different concerns:
- Drizzle = Database representation
- TypeBox = API contract & validation

### Monorepo Workspace Pattern

**Shared Packages**: `@repo/database` package shared across apps

**Benefits**:
- Single source of truth
- Type safety across apps
- Consistent data layer
- Easier refactoring

**Usage**:
```typescript
import { peopleDAO, PersonSchema } from '@repo/database';
```

### Type Generation Flow

```
Drizzle Schema → Database
       ↓
TypeBox Schema → OpenAPI Spec → TypeScript Types → Frontend
       ↓
Backend Routes (Fastify)
```

All types flow from source definitions, ensuring consistency.

## Spec Kit Constitution Guide

This section provides architectural and technical guidelines for use with [GitHub Spec Kit](https://github.com/github/spec-kit) when generating constitution documents for projects based on this starter.

### Overview for AI Assistants

When using Spec Kit to generate a constitution document for a project built on this starter template, follow these architectural patterns and technical constraints:

### Mandatory Architectural Patterns

#### 1. Data Layer Architecture (DAO Pattern)

**Pattern**: All database access MUST go through Data Access Objects (DAOs)

**Structure**:
```
API Route Handler → DAO Method → Drizzle ORM → PostgreSQL
```

**Rules**:
- ✅ NEVER import `drizzle-orm` directly in route handlers
- ✅ ALWAYS use DAO singleton instances exported from `@repo/database`
- ✅ ALL database queries must be encapsulated in DAO methods
- ✅ DAOs should return typed results using Drizzle-inferred types

**Example**:
```typescript
// ✅ CORRECT - Using DAO
import { usersDAO } from '@repo/database';
const user = await usersDAO.findById(id);

// ❌ WRONG - Direct database access
import { db, users } from '@repo/database';
const user = await db.select().from(users).where(eq(users.id, id));
```

#### 2. Schema Separation Pattern

**Pattern**: Separate database schemas from validation schemas

**Two Schema Types**:

1. **Drizzle Schemas** (`packages/database/src/schema/*.ts`)
   - Define database table structure
   - Generate TypeScript types via inference
   - Drive database migrations

2. **TypeBox Schemas** (`packages/database/src/schemas/*.schema.ts`)
   - Define API request/response validation
   - Generate OpenAPI documentation
   - Provide runtime validation

**Rules**:
- ✅ Drizzle schemas are source of truth for database structure
- ✅ TypeBox schemas are source of truth for API contracts
- ✅ Keep both in sync manually (they serve different purposes)
- ✅ Export both from `@repo/database` package

**Example Structure**:
```typescript
// Drizzle Schema - Database representation
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
});

// TypeBox Schema - API validation
export const CreateTaskSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  status: Type.Enum(['pending', 'in_progress', 'completed']),
});
```

#### 3. Type Flow Pattern

**Pattern**: Types flow from schema definitions to API to frontend

**Flow**:
```
Drizzle Schema → Database Types
       ↓
TypeBox Schemas → Fastify Routes → OpenAPI Spec
       ↓
openapi-typescript → Frontend Types
```

**Rules**:
- ✅ Never duplicate type definitions
- ✅ Generate TypeScript types from OpenAPI spec for frontend
- ✅ Use Drizzle's `$inferSelect` and `$inferInsert` for DB types
- ✅ Use TypeBox's `Static<typeof Schema>` for API types

#### 4. Monorepo Package Pattern

**Pattern**: Shared database package for all apps

**Structure**:
```
packages/database/
  ├── src/
  │   ├── schema/           # Drizzle table definitions
  │   ├── schemas/          # TypeBox validation schemas
  │   ├── repositories/     # DAO classes
  │   ├── migrations/       # Auto-generated SQL migrations
  │   └── index.ts          # Public exports
```

**Rules**:
- ✅ Database package is workspace dependency: `@repo/database`
- ✅ Only export public API (DAOs, schemas, types)
- ✅ Keep database client internal (don't export `db`)
- ✅ All apps import from `@repo/database`, never relative paths

### Technical Constraints

#### Database Layer

**Technology**: PostgreSQL 18 with Drizzle ORM 0.44+

**Constraints**:
- All tables MUST have UUID primary keys: `uuid('id').primaryKey().defaultRandom()`
- All tables MUST have timestamps: `createdAt`, `updatedAt`
- Migrations MUST be auto-generated: `pnpm db:generate`
- Migrations run automatically on container start via `init.ts`
- Use postgres-js driver (not node-postgres or pg)

**Naming Conventions**:
- Tables: snake_case, plural (e.g., `user_profiles`)
- Columns: snake_case (e.g., `first_name`)
- TypeScript types: PascalCase (e.g., `UserProfile`)

#### API Layer

**Technology**: Fastify 5 with TypeBox validation

**Constraints**:
- ALL routes MUST have schema definitions (description, tags, request, response)
- Use TypeBox for all validation (not Zod, Joi, or Yup)
- Import schemas from `@repo/database`, don't define inline
- Return proper HTTP status codes (201 for create, 204 for delete)
- Use consistent error response format: `{ error: string, message: string }`

**Route Structure**:
```typescript
fastify.get<{ Querystring: QueryDTO }>('/endpoint', {
  schema: {
    description: 'Clear description for OpenAPI docs',
    tags: ['tag-name'],
    querystring: QuerySchema,
    response: {
      200: SuccessSchema,
      404: ErrorResponseSchema,
    },
  },
  handler: async (request, reply) => {
    // Use DAO only
    const result = await someDAO.method();
    return result;
  },
});
```

#### Frontend Layer

**Technology**: Next.js 15 (App Router) with React 19

**Constraints**:
- Use App Router ONLY (not Pages Router)
- Client components MUST be marked with `'use client'`
- API calls MUST use `openapi-fetch` generated client
- Import types from `@/lib/api/schema` (generated)
- Environment vars MUST be prefixed `NEXT_PUBLIC_` for client-side

**Type-Safe API Pattern**:
```typescript
import { apiClient } from '@/lib/api/client';
import type { paths } from '@/lib/api/schema';

// Fully typed request/response
const { data, error } = await apiClient.GET('/endpoint', {
  params: { query: { limit: 10 } }
});
```

### Development Workflow Rules

#### Database Changes

1. Update Drizzle schema in `packages/database/src/schema/`
2. Generate migration: `pnpm db:generate`
3. Migration auto-runs on container restart
4. Update corresponding TypeBox schema
5. Regenerate OpenAPI spec if API changed
6. Regenerate frontend types

#### Adding New Entity (Step-by-Step)

1. **Create Drizzle Schema** (`packages/database/src/schema/entity.ts`)
2. **Export from schema index** (`packages/database/src/schema/index.ts`)
3. **Create TypeBox Schemas** (`packages/database/src/schemas/entity.schema.ts`)
4. **Create DAO** (`packages/database/src/repositories/entity.dao.ts`)
5. **Export from package** (`packages/database/src/index.ts`)
6. **Generate migration** (`pnpm db:generate`)
7. **Create API routes** (`apps/backend-api/src/routes/entity/index.ts`)
8. **Register routes** (`apps/backend-api/src/routes/index.ts`)
9. **Regenerate OpenAPI** (`pnpm generate:openapi`)
10. **Generate frontend types** (`pnpm generate:types`)

#### Code Organization Rules

**Backend Routes**:
- One folder per resource: `routes/users/`, `routes/tasks/`
- Export default: `export default usersRoutes;`
- Register in `routes/index.ts`

**DAO Methods**:
- Naming: `findAll`, `findById`, `findByX`, `create`, `update`, `delete`
- Return types: Use Drizzle inferred types
- Error handling: Throw errors, let route handler catch

**Component Structure**:
- Client components in `apps/web-client/src/components/`
- Server components in `apps/web-client/src/app/` (page.tsx, layout.tsx)
- API utilities in `apps/web-client/src/lib/`

### Environment Variables

**Development** (`.env.dev`):
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@database:5432/app_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app_db

# API
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Ports
BACKEND_API_PORT=3001
WEB_CLIENT_PORT=3000
```

**Production** (`.env.prod`):
- MUST change all passwords
- MUST set CORS_ORIGIN to production domain
- MUST update NEXT_PUBLIC_API_URL to production API

### Docker Compose Structure

**Services Required**:
1. `database` - PostgreSQL 18 Alpine
2. `backend-api` - Fastify API server
3. `web-client` - Next.js frontend

**Network**:
- Internal network: `app-network`
- Database NOT exposed to host
- Backend and frontend exposed via ports

**Startup Order**:
1. Database starts
2. Backend waits for DB health check
3. Backend runs `init.ts` (migrate + seed)
4. Backend starts API server
5. Frontend starts (can access backend)

### OpenAPI Documentation Requirements

**Scalar Documentation**:
- MUST be available at `/docs` endpoint
- MUST include all routes with descriptions
- MUST show request/response schemas with "try it out" functionality
- MUST organize by tags
- Static HTML generated from OpenAPI spec

**OpenAPI Spec**:
- Generated in `apps/backend-api/openapi/openapi.json`
- Used by Scalar for interactive documentation
- Used by frontend for type generation
- Version: OpenAPI 3.0.0

### Testing Patterns (When Implemented)

**DAO Testing**:
- Mock database or use test DB
- Test all CRUD operations
- Test edge cases (not found, duplicates)

**API Testing**:
- Mock DAOs
- Test validation (invalid input)
- Test error responses
- Test authentication/authorization

**Frontend Testing**:
- Mock API client
- Test user interactions
- Test error states

### Extension Guidelines

When adding features beyond the starter:

**Authentication**:
- Use `@fastify/jwt` for JWT tokens
- Store users in database with hashed passwords
- Add `preHandler` hooks for protected routes
- Add `userId` foreign keys to entities

**File Upload**:
- Use `@fastify/multipart`
- Store files in S3 or similar (not local filesystem in production)
- Validate file types and sizes
- Return CDN URLs in API responses

**Real-time**:
- Add Socket.io or native WebSocket
- Share types between REST and WebSocket
- Use same authentication mechanism

**Background Jobs**:
- Add BullMQ with Redis
- Define job types as TypeScript interfaces
- Queue from API routes, process in workers

### Spec Kit Constitution Structure

When generating a constitution with Spec Kit, structure it as follows:

#### Required Sections

1. **Technical Foundation**
   - List this starter as base
   - Specify any additional dependencies
   - Justify technology choices if deviating

2. **Domain Model**
   - Define all entities with Drizzle schemas
   - Show relationships (foreign keys)
   - List DAO methods for each entity

3. **API Contract**
   - Document all endpoints
   - Show request/response schemas
   - Specify authentication requirements
   - Define error scenarios

4. **Frontend Features**
   - Map routes to API endpoints
   - Define component hierarchy
   - Specify state management approach

5. **Security Model**
   - Authentication mechanism
   - Authorization rules (who can do what)
   - CORS policy
   - Rate limiting strategy

6. **Development Workflow**
   - Git branching strategy
   - Code review process
   - Deployment pipeline

### Example Spec Kit Prompt

```markdown
Generate a constitution for a Task Management System using the Enterprise Monorepo Starter.

Requirements:
- Users can create, view, update, delete tasks
- Tasks have: title, description, status, due date
- Users must be authenticated
- Tasks belong to users (1:many)

Follow these patterns from the starter:
1. Create `tasks` table with Drizzle
2. Create TasksDAO with CRUD methods
3. Create TypeBox schemas for validation
4. Create Fastify routes using DAO
5. Generate OpenAPI spec
6. Create Next.js components with type-safe API calls

Include:
- Complete Drizzle schema
- Complete DAO implementation
- All API endpoints with schemas
- Frontend component structure
- Environment variables needed
```

### Validation Checklist

Before finalizing a constitution, verify:

- [ ] All entities have Drizzle schemas
- [ ] All entities have corresponding DAOs
- [ ] All entities have TypeBox validation schemas
- [ ] All API routes use DAOs (not direct DB access)
- [ ] All API routes have complete schema definitions
- [ ] OpenAPI spec generation is documented
- [ ] Frontend type generation workflow is defined
- [ ] Environment variables are specified
- [ ] Docker services are configured correctly
- [ ] Migration strategy is clear
- [ ] CORS policy is defined

---

## Additional Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Fastify Documentation](https://www.fastify.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [OpenAPI Specification](https://swagger.io/specification/)
- [pnpm Workspace](https://pnpm.io/workspaces)

## License

[Your License]

## Contributing

[Your contribution guidelines]
