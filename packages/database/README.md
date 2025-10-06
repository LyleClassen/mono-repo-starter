# @repo/database

Database package using Drizzle ORM with PostgreSQL.

## Features

- **Drizzle ORM**: Type-safe database queries
- **PostgreSQL 18**: Latest PostgreSQL version with Alpine image
- **Auto-migrations**: Automatically runs migrations on startup
- **Auto-seeding**: Seeds database with mock data if empty
- **Type safety**: Full TypeScript support with inferred types

## Schema

### People Table

- `id` (UUID): Primary key
- `firstName` (VARCHAR): First name
- `lastName` (VARCHAR): Last name
- `email` (VARCHAR): Unique email address
- `age` (INTEGER): Age
- `city` (VARCHAR): City
- `country` (VARCHAR): Country
- `createdAt` (TIMESTAMP): Creation timestamp
- `updatedAt` (TIMESTAMP): Last update timestamp

## Scripts

- `pnpm db:generate` - Generate migrations from schema
- `pnpm db:migrate` - Run migrations manually
- `pnpm db:seed` - Seed database manually
- `pnpm db:init` - Initialize database (runs migrations + seeds if empty)
- `pnpm db:studio` - Open Drizzle Studio for database management

## Usage

### In Docker (Automatic)

When you run `docker compose up`, the database will automatically:
1. Run migrations
2. Seed with 20 mock people entries (only if database is empty)

### Using the Database Client

```typescript
import { db, people } from '@repo/database';

// Query all people
const allPeople = await db.select().from(people);

// Insert a person
await db.insert(people).values({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30,
  city: 'New York',
  country: 'USA'
});
```

## Environment Variables

Required environment variables (already configured in `.env.dev` and `.env.prod`):

- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name
