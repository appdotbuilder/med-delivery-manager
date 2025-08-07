
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { login } from '../handlers/login';

// Test user data
const testUser: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  role: 'patient',
  phone: '+1234567890'
};

const loginInput: LoginInput = {
  email: 'john@example.com',
  password: 'password123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user for valid credentials', async () => {
    // Create a test user first
    await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        phone: testUser.phone
      })
      .execute();

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john@example.com');
    expect(result!.role).toEqual('patient');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for invalid email', async () => {
    // Create a test user first
    await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        phone: testUser.phone
      })
      .execute();

    const invalidEmailInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    const result = await login(invalidEmailInput);

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create a test user first
    await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        phone: testUser.phone
      })
      .execute();

    const invalidPasswordInput: LoginInput = {
      email: 'john@example.com',
      password: 'wrongpassword'
    };

    const result = await login(invalidPasswordInput);

    expect(result).toBeNull();
  });

  it('should return null when no users exist', async () => {
    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should handle different user roles correctly', async () => {
    // Create admin user
    await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'adminpass',
        role: 'admin',
        phone: null
      })
      .execute();

    const adminLogin: LoginInput = {
      email: 'admin@example.com',
      password: 'adminpass'
    };

    const result = await login(adminLogin);

    expect(result).not.toBeNull();
    expect(result!.role).toEqual('admin');
    expect(result!.name).toEqual('Admin User');
    expect(result!.phone).toBeNull();
  });
});
