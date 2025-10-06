import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  age: integer('age').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
