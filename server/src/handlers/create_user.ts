
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash password before storing
    const hashedPassword = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role,
        phone: input.phone
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      phone: user.phone,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
