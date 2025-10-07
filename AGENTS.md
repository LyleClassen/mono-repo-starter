# Agent Guide - Enterprise Monorepo Starter

> **Purpose**: This document provides comprehensive architectural patterns, technical constraints, and development workflows for AI agents building applications with this starter template.

## Table of Contents

- [Quick Start for Agents](#quick-start-for-agents)
- [Core Architecture](#core-architecture)
- [Mandatory Patterns](#mandatory-patterns)
- [Technology Stack](#technology-stack)
- [Step-by-Step Workflows](#step-by-step-workflows)
- [Code Examples](#code-examples)
- [Technical Constraints](#technical-constraints)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Anti-Patterns](#anti-patterns)

---

## Quick Start for Agents

### Project Overview

This is a production-ready, enterprise-grade monorepo starter with:
- **Backend**: Fastify 5 REST API with OpenAPI documentation
- **Frontend**: Next.js 15 (App Router) with React 19
- **Database**: PostgreSQL 18 with Drizzle ORM
- **Infrastructure**: Docker Compose for development and production

### First-Time Setup

```bash
# Clone and start
cd project-root
docker compose -f docker-compose.dev.yml up -d

# Verify services
# Backend API: http://localhost:3001
# API Docs: http://localhost:3001/docs
# Frontend: http://localhost:3000
# Database: PostgreSQL (internal network only)
```

### Key Files to Understand

```
mono-repo-starter/
├── packages/database/           # Shared database package
│   ├── src/schema/             # Drizzle table definitions
│   ├── src/schemas/            # TypeBox API validation schemas
│   ├── src/repositories/       # DAO classes (data access layer)
│   └── src/index.ts            # Public API exports
├── apps/backend-api/           # Fastify REST API
│   └── src/routes/             # API route handlers
└── apps/web-client/            # Next.js frontend
    ├── src/components/         # React components
    └── src/lib/api/            # Type-safe API client
```

---

## Core Architecture

### 1. Three-Layer Architecture

```
Frontend (Next.js)
    ↓ HTTP/JSON
Backend API (Fastify)
    ↓ DAO Pattern
Database Layer (Drizzle ORM)
    ↓ SQL
PostgreSQL 18
```

### 2. Data Access Object (DAO) Pattern

**Critical Rule**: ALL database access MUST go through DAOs.

```typescript
// ✅ CORRECT - Route uses DAO
import { usersDAO } from '@repo/database';

fastify.get('/users/:id', {
  handler: async (request, reply) => {
    const user = await usersDAO.findById(request.params.id);
    if (!user) {
      reply.code(404);
      return { error: 'Not Found', message: 'User not found' };
    }
    return user;
  },
});

// ❌ WRONG - Direct database access in route
import { db, users } from '@repo/database';
import { eq } from 'drizzle-orm';

fastify.get('/users/:id', {
  handler: async (request, reply) => {
    const user = await db.select().from(users).where(eq(users.id, request.params.id));
    return user;
  },
});
```

**Why DAOs?**
- Single source of truth for data operations
- Easier testing (mock DAOs, not database)
- Consistent error handling
- Database agnostic (swap ORMs easily)
- Type safety with Drizzle inferred types

### 3. Schema Separation Pattern

**Two Types of Schemas** (NEVER confuse these):

#### Drizzle Schemas (Database Structure)
- Location: `packages/database/src/schema/*.ts`
- Purpose: Define database tables and relationships
- Used for: Migrations, type inference, queries

```typescript
// packages/database/src/schema/users.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export TypeScript types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

#### TypeBox Schemas (API Validation)
- Location: `packages/database/src/schemas/*.schema.ts`
- Purpose: Define API request/response validation and OpenAPI docs
- Used for: Runtime validation, Swagger UI, frontend type generation

```typescript
// packages/database/src/schemas/users.schema.ts
import { Type, Static } from '@sinclair/typebox';

// Request schemas
export const CreateUserSchema = Type.Object({
  username: Type.String({ minLength: 3, maxLength: 100 }),
  email: Type.String({ format: 'email', maxLength: 255 }),
});

export const UpdateUserSchema = Type.Partial(CreateUserSchema);

export const UserParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

// Response schemas
export const UserResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  username: Type.String(),
  email: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const UsersListResponseSchema = Type.Object({
  data: Type.Array(UserResponseSchema),
  total: Type.Integer(),
});

// TypeScript types
export type CreateUserDTO = Static<typeof CreateUserSchema>;
export type UpdateUserDTO = Static<typeof UpdateUserSchema>;
export type UserResponse = Static<typeof UserResponseSchema>;
```

**Why Separate?**
- Drizzle schemas are for database representation (DDL)
- TypeBox schemas are for API contracts (validation & docs)
- They serve different concerns and may diverge
- Example: API might not expose all DB columns (like password hashes)

### 4. Type Flow Pattern

```
Step 1: Define Drizzle Schema
   ↓
Step 2: Generate Migration (pnpm db:generate)
   ↓
Step 3: Define TypeBox Schemas
   ↓
Step 4: Create DAO with typed methods
   ↓
Step 5: Create API routes with schema validation
   ↓
Step 6: Generate OpenAPI spec (pnpm generate:openapi)
   ↓
Step 7: Generate frontend types (pnpm generate:types)
   ↓
Step 8: Use type-safe API client in frontend
```

**Type Safety Across Stack**:
```typescript
// Database types (from Drizzle)
type User = typeof users.$inferSelect;

// API types (from TypeBox)
type CreateUserDTO = Static<typeof CreateUserSchema>;

// Frontend types (from OpenAPI)
import type { paths } from '@/lib/api/schema';
type UsersResponse = paths['/users']['get']['responses']['200']['content']['application/json'];
```

---

## Mandatory Patterns

### Pattern 1: DAO Implementation

Every entity MUST have a DAO class with standard CRUD methods.

```typescript
// packages/database/src/repositories/users.dao.ts
import { db } from '../client.js';
import { users, type User, type NewUser } from '../schema/users.js';
import { eq } from 'drizzle-orm';

export class UsersDAO {
  /**
   * Find all users with pagination
   */
  async findAll(options?: { limit?: number; offset?: number }): Promise<{
    data: User[];
    total: number;
  }> {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const [usersList, totalResult] = await Promise.all([
      db.select().from(users).limit(limit).offset(offset),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(users),
    ]);

    return {
      data: usersList,
      total: totalResult[0].count,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  /**
   * Create new user
   */
  async create(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  /**
   * Update user by ID
   */
  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
}

// Export singleton instance
export const usersDAO = new UsersDAO();
```

**DAO Method Naming Convention**:
- `findAll` - List with pagination
- `findById` - Get single by primary key
- `findByX` - Get single by other field
- `create` - Insert new record
- `update` - Update existing record
- `delete` - Remove record

### Pattern 2: API Route Structure

Every route MUST have complete schema definitions for OpenAPI generation.

```typescript
// apps/backend-api/src/routes/users/index.ts
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { usersDAO } from '@repo/database';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserParamsSchema,
  UserResponseSchema,
  UsersListResponseSchema,
} from '@repo/database/schemas';

// Error response schema (reusable)
const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
});

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // List users
  fastify.get<{
    Querystring: { limit?: number; offset?: number };
  }>('/users', {
    schema: {
      description: 'Get list of all users with pagination',
      tags: ['users'],
      querystring: Type.Object({
        limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
        offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
      }),
      response: {
        200: UsersListResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { limit, offset } = request.query;
      const result = await usersDAO.findAll({ limit, offset });
      return result;
    },
  });

  // Get user by ID
  fastify.get<{
    Params: { id: string };
  }>('/users/:id', {
    schema: {
      description: 'Get a user by ID',
      tags: ['users'],
      params: UserParamsSchema,
      response: {
        200: UserResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = await usersDAO.findById(request.params.id);

      if (!user) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `User with id ${request.params.id} not found`,
        };
      }

      return user;
    },
  });

  // Create user
  fastify.post<{
    Body: { username: string; email: string };
  }>('/users', {
    schema: {
      description: 'Create a new user',
      tags: ['users'],
      body: CreateUserSchema,
      response: {
        201: UserResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = await usersDAO.create(request.body);
      reply.code(201);
      return user;
    },
  });

  // Update user
  fastify.put<{
    Params: { id: string };
    Body: { username?: string; email?: string };
  }>('/users/:id', {
    schema: {
      description: 'Update a user by ID',
      tags: ['users'],
      params: UserParamsSchema,
      body: UpdateUserSchema,
      response: {
        200: UserResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = await usersDAO.update(request.params.id, request.body);

      if (!user) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `User with id ${request.params.id} not found`,
        };
      }

      return user;
    },
  });

  // Delete user
  fastify.delete<{
    Params: { id: string };
  }>('/users/:id', {
    schema: {
      description: 'Delete a user by ID',
      tags: ['users'],
      params: UserParamsSchema,
      response: {
        204: Type.Null(),
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const deleted = await usersDAO.delete(request.params.id);

      if (!deleted) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `User with id ${request.params.id} not found`,
        };
      }

      reply.code(204);
      return;
    },
  });
};

export default usersRoutes;
```

**Route Requirements**:
- ✅ Every route MUST have `schema` object
- ✅ Every schema MUST have `description` and `tags`
- ✅ Define all possible response codes (200, 201, 400, 404, etc.)
- ✅ Use TypeBox schemas imported from `@repo/database`
- ✅ Return proper HTTP status codes
- ✅ Use consistent error response format

### Pattern 3: Frontend Type-Safe API Calls

Frontend MUST use generated OpenAPI types and typed client.

```typescript
// apps/web-client/src/components/user-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import type { paths } from '@/lib/api/schema';

// Extract types from OpenAPI spec
type UsersResponse = paths['/users']['get']['responses']['200']['content']['application/json'];
type User = UsersResponse['data'][number];

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);

      // Type-safe API call
      const { data, error: apiError } = await apiClient.GET('/users', {
        params: {
          query: {
            limit: 20,
            offset: 0,
          },
        },
      });

      if (data) {
        setUsers(data.data);
      } else {
        setError(apiError?.message || 'Failed to fetch users');
      }

      setLoading(false);
    }

    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.username} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Frontend Requirements**:
- ✅ Import `apiClient` from `@/lib/api/client`
- ✅ Import types from `@/lib/api/schema`
- ✅ Use `paths[...]` to extract response types
- ✅ Handle `data` and `error` from API calls
- ✅ Mark client components with `'use client'`

---

## Technology Stack

### Backend
- **Fastify 5**: Fast, low-overhead web framework
- **TypeBox**: JSON Schema validation and type generation
- **@fastify/swagger**: OpenAPI spec generation
- **@fastify/swagger-ui**: Interactive API docs
- **@fastify/cors**: CORS middleware
- **Pino**: Fast JSON logger with pino-pretty for dev

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript 5**: Type safety
- **openapi-fetch**: Type-safe API client
- **openapi-typescript**: Generate types from OpenAPI spec

### Database
- **PostgreSQL 18**: Relational database
- **Drizzle ORM 0.44+**: TypeScript ORM with type inference
- **drizzle-kit**: Migration generator
- **postgres**: Lightweight postgres client

### Infrastructure
- **Docker Compose**: Multi-container orchestration
- **pnpm**: Fast, disk-efficient package manager
- **tsx**: TypeScript executor for scripts
- **Node 22**: JavaScript runtime

---

## Step-by-Step Workflows

### Workflow 1: Adding a New Entity

**Example**: Add a `tasks` entity for task management.

#### Step 1: Create Drizzle Schema

```typescript
// packages/database/src/schema/tasks.ts
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

#### Step 2: Export from Schema Index

```typescript
// packages/database/src/schema/index.ts
export * from './people.js';
export * from './tasks.js'; // Add this
```

#### Step 3: Create TypeBox Schemas

```typescript
// packages/database/src/schemas/tasks.schema.ts
import { Type, Static } from '@sinclair/typebox';

export const CreateTaskSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  status: Type.Optional(
    Type.Union([
      Type.Literal('pending'),
      Type.Literal('in_progress'),
      Type.Literal('completed'),
    ])
  ),
});

export const UpdateTaskSchema = Type.Partial(CreateTaskSchema);

export const TaskParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const ListTasksQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  status: Type.Optional(Type.String()),
});

export const TaskResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  status: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const TasksListResponseSchema = Type.Object({
  data: Type.Array(TaskResponseSchema),
  total: Type.Integer(),
});

export type CreateTaskDTO = Static<typeof CreateTaskSchema>;
export type UpdateTaskDTO = Static<typeof UpdateTaskSchema>;
export type ListTasksQueryDTO = Static<typeof ListTasksQuerySchema>;
```

#### Step 4: Export from Schemas Index

```typescript
// packages/database/src/schemas/index.ts
export * from './people.schema.js';
export * from './tasks.schema.js'; // Add this
```

#### Step 5: Create DAO

```typescript
// packages/database/src/repositories/tasks.dao.ts
import { db } from '../client.js';
import { tasks, type Task, type NewTask } from '../schema/tasks.js';
import { eq, sql, ilike } from 'drizzle-orm';

export class TasksDAO {
  async findAll(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ data: Task[]; total: number }> {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const status = options?.status;

    const whereClause = status ? eq(tasks.status, status) : undefined;

    const [tasksList, totalResult] = await Promise.all([
      db
        .select()
        .from(tasks)
        .where(whereClause)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(tasks)
        .where(whereClause),
    ]);

    return {
      data: tasksList,
      total: totalResult[0].count,
    };
  }

  async findById(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async create(data: NewTask): Promise<Task> {
    const result = await db.insert(tasks).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewTask>): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }
}

export const tasksDAO = new TasksDAO();
```

#### Step 6: Export from Repositories Index

```typescript
// packages/database/src/repositories/index.ts
export * from './people.dao.js';
export * from './tasks.dao.js'; // Add this
```

#### Step 7: Export from Database Package

```typescript
// packages/database/src/index.ts
export * from './schema/index.js';
export * from './schemas/index.js';
export * from './repositories/index.js';
```

#### Step 8: Generate Migration

```bash
cd packages/database
pnpm db:generate
```

This creates a new migration file in `packages/database/drizzle/`.

#### Step 9: Restart Database Container

```bash
docker compose -f docker-compose.dev.yml restart database backend-api
```

The `init.ts` script automatically runs migrations on startup.

#### Step 10: Create API Routes

```typescript
// apps/backend-api/src/routes/tasks/index.ts
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { tasksDAO } from '@repo/database';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskParamsSchema,
  ListTasksQuerySchema,
  TaskResponseSchema,
  TasksListResponseSchema,
  type CreateTaskDTO,
  type UpdateTaskDTO,
  type ListTasksQueryDTO,
} from '@repo/database/schemas';

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
});

const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: ListTasksQueryDTO }>('/tasks', {
    schema: {
      description: 'Get list of all tasks with optional filtering',
      tags: ['tasks'],
      querystring: ListTasksQuerySchema,
      response: {
        200: TasksListResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { limit, offset, status } = request.query;
      const result = await tasksDAO.findAll({ limit, offset, status });
      return result;
    },
  });

  fastify.get<{ Params: { id: string } }>('/tasks/:id', {
    schema: {
      description: 'Get a task by ID',
      tags: ['tasks'],
      params: TaskParamsSchema,
      response: {
        200: TaskResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const task = await tasksDAO.findById(request.params.id);

      if (!task) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `Task with id ${request.params.id} not found`,
        };
      }

      return task;
    },
  });

  fastify.post<{ Body: CreateTaskDTO }>('/tasks', {
    schema: {
      description: 'Create a new task',
      tags: ['tasks'],
      body: CreateTaskSchema,
      response: {
        201: TaskResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const task = await tasksDAO.create(request.body);
      reply.code(201);
      return task;
    },
  });

  fastify.put<{
    Params: { id: string };
    Body: UpdateTaskDTO;
  }>('/tasks/:id', {
    schema: {
      description: 'Update a task by ID',
      tags: ['tasks'],
      params: TaskParamsSchema,
      body: UpdateTaskSchema,
      response: {
        200: TaskResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const task = await tasksDAO.update(request.params.id, request.body);

      if (!task) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `Task with id ${request.params.id} not found`,
        };
      }

      return task;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/tasks/:id', {
    schema: {
      description: 'Delete a task by ID',
      tags: ['tasks'],
      params: TaskParamsSchema,
      response: {
        204: Type.Null(),
        404: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const deleted = await tasksDAO.delete(request.params.id);

      if (!deleted) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: `Task with id ${request.params.id} not found`,
        };
      }

      reply.code(204);
      return;
    },
  });
};

export default tasksRoutes;
```

#### Step 11: Register Routes

```typescript
// apps/backend-api/src/routes/index.ts
import { FastifyInstance } from 'fastify';
import healthRoutes from './health/index.js';
import peopleRoutes from './people/index.js';
import tasksRoutes from './tasks/index.js'; // Add this

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(peopleRoutes);
  await fastify.register(tasksRoutes); // Add this
}
```

#### Step 12: Update Swagger Tags

```typescript
// apps/backend-api/src/index.ts
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Backend API',
      description: 'REST API documentation',
      version: '1.0.0',
    },
    tags: [
      { name: 'health', description: 'Health check endpoints' },
      { name: 'people', description: 'People CRUD operations' },
      { name: 'tasks', description: 'Task management operations' }, // Add this
    ],
  },
});
```

#### Step 13: Regenerate OpenAPI Spec

```bash
cd apps/backend-api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db pnpm generate:openapi
```

#### Step 14: Generate Frontend Types

```bash
cd apps/web-client
pnpm generate:types
```

#### Step 15: Restart Backend

```bash
docker compose -f docker-compose.dev.yml restart backend-api
```

#### Step 16: Verify API Documentation

Visit http://localhost:3001/docs and verify:
- Tasks endpoints appear under "tasks" tag
- All request/response schemas are documented
- Try out the endpoints

### Workflow 2: Adding a Frontend Component

**Example**: Create a task list component.

```typescript
// apps/web-client/src/components/task-list.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { paths } from '@/lib/api/schema';

type TasksResponse = paths['/tasks']['get']['responses']['200']['content']['application/json'];
type Task = TasksResponse['data'][number];

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);

    const { data, error } = await apiClient.GET('/tasks', {
      params: {
        query: {
          limit: 50,
          ...(filter && { status: filter }),
        },
      },
    });

    if (data) {
      setTasks(data.data);
    } else {
      console.error('Failed to fetch tasks:', error);
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async () => {
    const title = prompt('Enter task title:');
    if (!title) return;

    const { data, error } = await apiClient.POST('/tasks', {
      body: {
        title,
        status: 'pending',
      },
    });

    if (data) {
      fetchTasks(); // Refresh list
    } else {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;

    const { error } = await apiClient.DELETE('/tasks/{id}', {
      params: {
        path: { id },
      },
    });

    if (!error) {
      fetchTasks(); // Refresh list
    } else {
      console.error('Failed to delete task:', error);
    }
  };

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <button
          onClick={handleCreateTask}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Task
        </button>
      </div>

      <div className="mb-4">
        <label className="mr-2">Filter by status:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 border rounded"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="p-3 border rounded flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-sm text-gray-600">{task.status}</p>
            </div>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {tasks.length === 0 && (
        <p className="text-gray-500 text-center mt-4">No tasks found</p>
      )}
    </div>
  );
}
```

### Workflow 3: Database Migration

**Scenario**: Add a new column to existing table.

#### Step 1: Update Drizzle Schema

```typescript
// packages/database/src/schema/tasks.ts
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  dueDate: timestamp('due_date'), // Add this
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### Step 2: Generate Migration

```bash
cd packages/database
pnpm db:generate
```

This creates a new migration file with ALTER TABLE statement.

#### Step 3: Review Migration

Check `packages/database/drizzle/` for the new migration SQL file.

#### Step 4: Apply Migration

```bash
docker compose -f docker-compose.dev.yml restart database backend-api
```

Or manually:
```bash
cd packages/database
pnpm migrate
```

#### Step 5: Update TypeBox Schema (if needed)

```typescript
// packages/database/src/schemas/tasks.schema.ts
export const CreateTaskSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  status: Type.Optional(Type.String()),
  dueDate: Type.Optional(Type.String({ format: 'date-time' })), // Add this
});
```

#### Step 6: Regenerate OpenAPI and Types

```bash
cd apps/backend-api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db pnpm generate:openapi

cd ../web-client
pnpm generate:types
```

---

## Technical Constraints

### Database Layer

**Technology**: PostgreSQL 18 with Drizzle ORM 0.44+

**Mandatory Requirements**:
- ✅ All tables MUST have UUID primary key: `uuid('id').primaryKey().defaultRandom()`
- ✅ All tables MUST have timestamps: `createdAt`, `updatedAt`
- ✅ Use `postgres` driver (not `pg` or `node-postgres`)
- ✅ Migrations MUST be auto-generated: `pnpm db:generate`
- ✅ Migrations run automatically on container start

**Naming Conventions**:
- Tables: `snake_case`, plural (e.g., `user_profiles`, `task_items`)
- Columns: `snake_case` (e.g., `first_name`, `created_at`)
- TypeScript types: `PascalCase` (e.g., `UserProfile`, `TaskItem`)

**Relationships**:
```typescript
// Foreign key example
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // ... other fields
});
```

### API Layer

**Technology**: Fastify 5 with TypeBox validation

**Mandatory Requirements**:
- ✅ ALL routes MUST have schema definitions
- ✅ Use TypeBox for validation (not Zod, Joi, Yup)
- ✅ Import schemas from `@repo/database`
- ✅ Return proper HTTP status codes:
  - 200: Success (GET, PUT)
  - 201: Created (POST)
  - 204: No Content (DELETE)
  - 400: Bad Request (validation error)
  - 404: Not Found
  - 500: Server Error
- ✅ Error responses: `{ error: string, message: string }`

**CORS Configuration**:
```typescript
// apps/backend-api/src/index.ts
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
```

**Logging**:
- Development: Pino Pretty (human-readable with emojis)
- Production: JSON logs
- Hooks log requests/responses automatically

### Frontend Layer

**Technology**: Next.js 15 (App Router) with React 19

**Mandatory Requirements**:
- ✅ Use App Router ONLY (not Pages Router)
- ✅ Client components MUST have `'use client'` directive
- ✅ Server components are default (no directive needed)
- ✅ API calls MUST use `openapi-fetch` client
- ✅ Import types from `@/lib/api/schema`
- ✅ Environment variables MUST be prefixed `NEXT_PUBLIC_` for client-side

**Environment Variables**:
```env
# apps/web-client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Docker Compose

**Service Requirements**:

1. **database**
   - Image: `postgres:18-alpine`
   - NOT exposed to host (internal network only)
   - Health check required

2. **backend-api**
   - Depends on database
   - Waits for DB health check
   - Runs migrations on start
   - Exposed on `BACKEND_API_PORT`

3. **web-client**
   - Independent (can start anytime)
   - Exposed on `WEB_CLIENT_PORT`

**Network**:
- All services on `app-network`
- Bridge driver

---

## Common Tasks

### Task 1: Add Search/Filter to Entity

**Example**: Add search to tasks by title.

#### Update TypeBox Schema:
```typescript
export const ListTasksQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })), // Add this
});
```

#### Update DAO:
```typescript
import { ilike, or } from 'drizzle-orm';

async findAll(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ data: Task[]; total: number }> {
  const limit = options?.limit ?? 10;
  const offset = options?.offset ?? 0;
  const search = options?.search;

  const searchCondition = search
    ? or(
        ilike(tasks.title, `%${search}%`),
        ilike(tasks.description, `%${search}%`)
      )
    : undefined;

  const [tasksList, totalResult] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(searchCondition)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tasks)
      .where(searchCondition),
  ]);

  return {
    data: tasksList,
    total: totalResult[0].count,
  };
}
```

#### Update Route:
```typescript
fastify.get<{ Querystring: ListTasksQueryDTO }>('/tasks', {
  schema: {
    // ... existing schema
    querystring: ListTasksQuerySchema,
  },
  handler: async (request, reply) => {
    const { limit, offset, search } = request.query;
    const result = await tasksDAO.findAll({ limit, offset, search });
    return result;
  },
});
```

### Task 2: Add Relationship Between Entities

**Example**: Tasks belong to users.

#### Update Drizzle Schema:
```typescript
// packages/database/src/schema/tasks.ts
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  // ... other fields
});
```

#### Generate Migration:
```bash
cd packages/database
pnpm db:generate
```

#### Update DAO to Include User:
```typescript
import { users } from '../schema/users.js';

async findById(id: string): Promise<(Task & { user: User }) | undefined> {
  const result = await db
    .select({
      task: tasks,
      user: users,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.userId, users.id))
    .where(eq(tasks.id, id))
    .limit(1);

  if (!result[0]) return undefined;

  return {
    ...result[0].task,
    user: result[0].user!,
  };
}
```

### Task 3: Add Environment Variable

#### Update `.env.dev`:
```env
NEW_FEATURE_ENABLED=true
```

#### Update `.env.prod`:
```env
NEW_FEATURE_ENABLED=false
```

#### Update Docker Compose:
```yaml
# docker-compose.dev.yml
backend-api:
  environment:
    - NEW_FEATURE_ENABLED=${NEW_FEATURE_ENABLED}
```

#### Use in Code:
```typescript
const isFeatureEnabled = process.env.NEW_FEATURE_ENABLED === 'true';
```

### Task 4: Seed Database

#### Update Seed Script:
```typescript
// packages/database/src/seed.ts
import { db } from './client.js';
import { tasks } from './schema/tasks.js';

export async function seed() {
  console.log('🌱 Seeding database...');

  // Seed tasks
  await db.insert(tasks).values([
    {
      title: 'Complete project documentation',
      description: 'Write comprehensive docs',
      status: 'pending',
    },
    {
      title: 'Review pull requests',
      description: 'Check all open PRs',
      status: 'in_progress',
    },
  ]);

  console.log('✅ Database seeded successfully');
}
```

#### Run Seed:
```bash
docker compose -f docker-compose.dev.yml restart backend-api
```

Or manually:
```bash
cd packages/database
pnpm seed
```

---

## Troubleshooting

### Issue: "No projects matched the filters in /app"

**Cause**: Missing `pnpm-lock.yaml` or workspace not configured.

**Solution**: Ensure `pnpm-workspace.yaml` exists and Dockerfile doesn't use `--frozen-lockfile` in dev mode.

```dockerfile
# Correct for dev
RUN pnpm install

# Correct for prod
RUN pnpm install --frozen-lockfile
```

### Issue: CORS Errors in Browser

**Cause**: CORS not configured or wrong origin.

**Solution**: Update `.env.dev`:
```env
CORS_ORIGIN=http://localhost:3000
```

Restart backend:
```bash
docker compose -f docker-compose.dev.yml restart backend-api
```

### Issue: Database Connection Failed

**Cause**: Database not ready or wrong credentials.

**Solution**: Check health status:
```bash
docker compose -f docker-compose.dev.yml ps
```

Verify `DATABASE_URL` in `.env.dev`:
```env
DATABASE_URL=postgresql://postgres:postgres@database:5432/app_db
```

### Issue: Frontend Types Not Updating

**Cause**: OpenAPI spec not regenerated or types not regenerated.

**Solution**: Regenerate both:
```bash
# 1. Generate OpenAPI spec
cd apps/backend-api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db pnpm generate:openapi

# 2. Generate frontend types
cd ../web-client
pnpm generate:types

# 3. Restart dev server
docker compose -f docker-compose.dev.yml restart web-client
```

### Issue: Migration Fails

**Cause**: Conflicting schema changes or manual database modifications.

**Solution**:
1. Check migration file in `packages/database/drizzle/`
2. Manually fix conflicts
3. Or drop database and recreate:
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Issue: Container Won't Start

**Cause**: Port already in use or build cache issue.

**Solution**:
```bash
# Rebuild without cache
docker compose -f docker-compose.dev.yml build --no-cache

# Start fresh
docker compose -f docker-compose.dev.yml up -d
```

---

## Anti-Patterns

### ❌ DON'T: Access Database Directly in Routes

```typescript
// ❌ WRONG
import { db, users } from '@repo/database';
import { eq } from 'drizzle-orm';

fastify.get('/users/:id', {
  handler: async (request, reply) => {
    const user = await db.select().from(users).where(eq(users.id, request.params.id));
    return user;
  },
});
```

**Why?** Violates DAO pattern, makes testing harder, duplicates logic.

### ❌ DON'T: Define Schemas Inline

```typescript
// ❌ WRONG
fastify.post('/users', {
  schema: {
    body: Type.Object({
      username: Type.String(),
      email: Type.String(),
    }),
  },
  handler: async (request, reply) => {
    // ...
  },
});
```

**Why?** Schemas should be reusable and versioned in `@repo/database`.

### ❌ DON'T: Use Fetch Directly

```typescript
// ❌ WRONG
const response = await fetch('http://localhost:3001/users');
const users = await response.json();
```

**Why?** No type safety, hardcoded URLs, error handling duplicated.

### ❌ DON'T: Mix Server and Client Code

```typescript
// ❌ WRONG - Trying to use DB in client component
'use client';

import { db, users } from '@repo/database';

export function UserList() {
  // This won't work!
  const usersList = await db.select().from(users);
  return <div>{usersList.map(...)}</div>;
}
```

**Why?** Database code only runs on server. Use API routes + API client.

### ❌ DON'T: Skip Schema Validation

```typescript
// ❌ WRONG
fastify.post('/users', {
  handler: async (request, reply) => {
    // No schema validation!
    const user = await usersDAO.create(request.body);
    return user;
  },
});
```

**Why?** Opens security vulnerabilities, no OpenAPI docs, runtime errors.

### ❌ DON'T: Use Pages Router

```typescript
// ❌ WRONG - pages/index.tsx
export default function Home() {
  return <div>Hello</div>;
}
```

**Why?** This starter uses App Router (`app/` directory). Mixing routers causes issues.

### ❌ DON'T: Hardcode Environment Variables

```typescript
// ❌ WRONG
const apiUrl = 'http://localhost:3001';

// ✅ CORRECT
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### ❌ DON'T: Forget Response Status Codes

```typescript
// ❌ WRONG
fastify.post('/users', {
  handler: async (request, reply) => {
    const user = await usersDAO.create(request.body);
    return user; // Defaults to 200, should be 201
  },
});

// ✅ CORRECT
fastify.post('/users', {
  handler: async (request, reply) => {
    const user = await usersDAO.create(request.body);
    reply.code(201);
    return user;
  },
});
```

---

## Summary

This guide covers everything an AI agent needs to build applications with this starter:

✅ **Core Patterns**: DAO, Schema Separation, Type Flow
✅ **Complete Workflows**: Adding entities, migrations, frontend components
✅ **Technical Constraints**: Database, API, frontend requirements
✅ **Code Examples**: Full implementations with TypeScript
✅ **Common Tasks**: Search, relationships, environment variables
✅ **Troubleshooting**: Common issues and solutions
✅ **Anti-Patterns**: What NOT to do

**Key Takeaways**:
1. ALWAYS use DAOs for database access
2. Separate Drizzle (DB) from TypeBox (API) schemas
3. Generate types from OpenAPI for frontend
4. Follow the 16-step workflow for new entities
5. Maintain type safety across the entire stack

---

**Next Steps**:
- Read the main [README.md](README.md) for getting started
- Review example implementations in `apps/backend-api/src/routes/people/`
- Check out the OpenAPI docs at http://localhost:3001/docs
- Generate a constitution with [GitHub Spec Kit](https://github.com/github/spec-kit)
