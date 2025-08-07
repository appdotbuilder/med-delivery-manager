
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getCouriers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'courier'))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch couriers:', error);
    throw error;
  }
};
