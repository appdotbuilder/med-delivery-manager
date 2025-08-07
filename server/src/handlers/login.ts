
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<User | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    const user = users[0];
    if (!user) {
      return null;
    }

    // Verify password (simple string comparison for now)
    // In production, this should use proper password hashing comparison
    if (user.password !== input.password) {
      return null;
    }

    // Return user data (excluding password for security)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password, // Note: In production, password should be excluded
      role: user.role,
      phone: user.phone,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
