import { eq, sql } from 'drizzle-orm';
import { db } from '../client.js';
import { people, type Person, type NewPerson } from '../schema/index.js';

export class PeopleDAO {
  /**
   * Get all people with pagination
   */
  async findAll(options?: { limit?: number; offset?: number }): Promise<{
    data: Person[];
    total: number;
  }> {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const [peopleList, totalResult] = await Promise.all([
      db.select().from(people).limit(limit).offset(offset),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(people),
    ]);

    return {
      data: peopleList,
      total: totalResult[0].count,
    };
  }

  /**
   * Find a person by ID
   */
  async findById(id: string): Promise<Person | null> {
    const result = await db.select().from(people).where(eq(people.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Find a person by email
   */
  async findByEmail(email: string): Promise<Person | null> {
    const result = await db.select().from(people).where(eq(people.email, email)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Create a new person
   */
  async create(data: NewPerson): Promise<Person> {
    const [newPerson] = await db.insert(people).values(data).returning();
    return newPerson;
  }

  /**
   * Update a person by ID
   */
  async update(id: string, data: Partial<NewPerson>): Promise<Person | null> {
    const [updatedPerson] = await db
      .update(people)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(people.id, id))
      .returning();

    return updatedPerson ?? null;
  }

  /**
   * Delete a person by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(people).where(eq(people.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Check if a person exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Count total people in database
   */
  async count(): Promise<number> {
    const result = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(people);
    return result[0].count;
  }
}

// Export a singleton instance
export const peopleDAO = new PeopleDAO();
