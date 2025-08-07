
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getCouriers } from '../handlers/get_couriers';

// Test users - mix of roles
const adminUser: CreateUserInput = {
  name: 'Admin User',
  email: 'admin@test.com',
  password: 'password123',
  role: 'admin',
  phone: '+1234567890'
};

const courierUser1: CreateUserInput = {
  name: 'Courier One',
  email: 'courier1@test.com',
  password: 'password123',
  role: 'courier',
  phone: '+1234567891'
};

const courierUser2: CreateUserInput = {
  name: 'Courier Two',
  email: 'courier2@test.com',
  password: 'password123',
  role: 'courier',
  phone: null
};

const hospitalStaffUser: CreateUserInput = {
  name: 'Hospital Staff',
  email: 'staff@test.com',
  password: 'password123',
  role: 'hospital_staff',
  phone: '+1234567892'
};

describe('getCouriers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all courier users', async () => {
    // Create users with different roles
    await db.insert(usersTable).values([
      adminUser,
      courierUser1,
      courierUser2,
      hospitalStaffUser
    ]).execute();

    const result = await getCouriers();

    // Should return only courier users
    expect(result).toHaveLength(2);
    
    const courierEmails = result.map(user => user.email);
    expect(courierEmails).toContain('courier1@test.com');
    expect(courierEmails).toContain('courier2@test.com');
    
    // Verify all returned users are couriers
    result.forEach(user => {
      expect(user.role).toEqual('courier');
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when no couriers exist', async () => {
    // Create only non-courier users
    await db.insert(usersTable).values([
      adminUser,
      hospitalStaffUser
    ]).execute();

    const result = await getCouriers();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no users exist', async () => {
    const result = await getCouriers();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle couriers with null phone numbers', async () => {
    // Create courier with null phone
    await db.insert(usersTable).values([courierUser2]).execute();

    const result = await getCouriers();

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('courier');
    expect(result[0].phone).toBeNull();
    expect(result[0].name).toEqual('Courier Two');
  });
});
