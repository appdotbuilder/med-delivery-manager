
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'admin',
  phone: '+1234567890'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    expect(result.name).toEqual('Test User');
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('admin');
    expect(result.phone).toEqual('+1234567890');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.password).toBeDefined();
    expect(result.password).not.toEqual('password123'); // Should be hashed
  });

  it('should create a user with nullable phone', async () => {
    const inputWithNullPhone = {
      ...testInput,
      phone: null
    };

    const result = await createUser(inputWithNullPhone);

    expect(result.name).toEqual('Test User');
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('admin');
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    expect(result.password).not.toEqual('password123');
    expect(result.password.length).toBeGreaterThan(20); // Hashed passwords are much longer
    
    // Verify password can be verified against hash
    const isValid = await Bun.password.verify('password123', result.password);
    expect(isValid).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Test User');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].role).toEqual('admin');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].password).not.toEqual('password123'); // Should be hashed
  });

  it('should create users with different roles', async () => {
    const hospitalStaffInput = {
      ...testInput,
      email: 'hospital@example.com',
      role: 'hospital_staff' as const
    };

    const courierInput = {
      ...testInput,
      email: 'courier@example.com',
      role: 'courier' as const
    };

    const patientInput = {
      ...testInput,
      email: 'patient@example.com',
      role: 'patient' as const
    };

    const hospitalStaff = await createUser(hospitalStaffInput);
    const courier = await createUser(courierInput);
    const patient = await createUser(patientInput);

    expect(hospitalStaff.role).toEqual('hospital_staff');
    expect(courier.role).toEqual('courier');
    expect(patient.role).toEqual('patient');
  });

  it('should enforce unique email constraint', async () => {
    await createUser(testInput);

    const duplicateInput = {
      ...testInput,
      name: 'Another User'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1Input = {
      ...testInput,
      email: 'user1@example.com'
    };

    const user2Input = {
      ...testInput,
      email: 'user2@example.com',
      role: 'courier' as const
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    expect(user1.email).toEqual('user1@example.com');
    expect(user2.email).toEqual('user2@example.com');
    expect(user1.role).toEqual('admin');
    expect(user2.role).toEqual('courier');
    expect(user1.id).not.toEqual(user2.id);
  });
});
