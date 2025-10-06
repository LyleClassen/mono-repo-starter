import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import { migrationClient } from './client.js';
import { db } from './client.js';
import { people } from './schema/index.js';

async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'people'
      );
    `);

    return !(result[0] as any).exists;
  } catch (error) {
    console.log('Database might be new, will run migrations');
    return true;
  }
}

async function isPeopleTableEmpty(): Promise<boolean> {
  try {
    const result = await db.select().from(people).limit(1);
    return result.length === 0;
  } catch (error) {
    return true;
  }
}

async function runMigrations() {
  console.log('Running migrations...');
  const migrateDb = drizzle(migrationClient);
  await migrate(migrateDb, { migrationsFolder: './drizzle' });
  console.log('Migrations completed successfully!');
}

async function runSeeding() {
  console.log('Seeding database...');

  const mockPeople = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', age: 28, city: 'New York', country: 'USA' },
    { firstName: 'Emma', lastName: 'Johnson', email: 'emma.johnson@example.com', age: 34, city: 'London', country: 'UK' },
    { firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', age: 42, city: 'Toronto', country: 'Canada' },
    { firstName: 'Sophia', lastName: 'Davis', email: 'sophia.davis@example.com', age: 25, city: 'Sydney', country: 'Australia' },
    { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@example.com', age: 31, city: 'Los Angeles', country: 'USA' },
    { firstName: 'Olivia', lastName: 'Martinez', email: 'olivia.martinez@example.com', age: 29, city: 'Madrid', country: 'Spain' },
    { firstName: 'William', lastName: 'Garcia', email: 'william.garcia@example.com', age: 36, city: 'Mexico City', country: 'Mexico' },
    { firstName: 'Ava', lastName: 'Rodriguez', email: 'ava.rodriguez@example.com', age: 27, city: 'Buenos Aires', country: 'Argentina' },
    { firstName: 'Alexander', lastName: 'Lee', email: 'alexander.lee@example.com', age: 45, city: 'Singapore', country: 'Singapore' },
    { firstName: 'Isabella', lastName: 'Kim', email: 'isabella.kim@example.com', age: 33, city: 'Seoul', country: 'South Korea' },
    { firstName: 'Benjamin', lastName: 'Nguyen', email: 'benjamin.nguyen@example.com', age: 38, city: 'Hanoi', country: 'Vietnam' },
    { firstName: 'Mia', lastName: 'Chen', email: 'mia.chen@example.com', age: 26, city: 'Beijing', country: 'China' },
    { firstName: 'Daniel', lastName: 'Patel', email: 'daniel.patel@example.com', age: 40, city: 'Mumbai', country: 'India' },
    { firstName: 'Charlotte', lastName: 'Singh', email: 'charlotte.singh@example.com', age: 30, city: 'Delhi', country: 'India' },
    { firstName: 'Henry', lastName: 'Müller', email: 'henry.muller@example.com', age: 35, city: 'Berlin', country: 'Germany' },
    { firstName: 'Amelia', lastName: 'Dubois', email: 'amelia.dubois@example.com', age: 32, city: 'Paris', country: 'France' },
    { firstName: 'Sebastian', lastName: 'Rossi', email: 'sebastian.rossi@example.com', age: 41, city: 'Rome', country: 'Italy' },
    { firstName: 'Harper', lastName: 'Silva', email: 'harper.silva@example.com', age: 24, city: 'São Paulo', country: 'Brazil' },
    { firstName: 'Lucas', lastName: 'Kowalski', email: 'lucas.kowalski@example.com', age: 37, city: 'Warsaw', country: 'Poland' },
    { firstName: 'Evelyn', lastName: 'Andersen', email: 'evelyn.andersen@example.com', age: 39, city: 'Copenhagen', country: 'Denmark' },
  ];

  await db.insert(people).values(mockPeople);
  console.log(`Successfully seeded ${mockPeople.length} people!`);
}

async function init() {
  console.log('Initializing database...');

  const dbEmpty = await isDatabaseEmpty();

  if (dbEmpty) {
    await runMigrations();
  } else {
    console.log('Database tables already exist, running migrations if needed...');
    await runMigrations();
  }

  console.log('Checking if people table needs seeding...');
  const tableEmpty = await isPeopleTableEmpty();

  if (tableEmpty) {
    await runSeeding();
  } else {
    console.log('People table already has data, skipping seed.');
  }

  await migrationClient.end();
  console.log('Database initialization complete!');
  process.exit(0);
}

init().catch((err) => {
  console.error('Database initialization failed!');
  console.error(err);
  process.exit(1);
});
