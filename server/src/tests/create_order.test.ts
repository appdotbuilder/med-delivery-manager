
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, patientsTable, usersTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPatientId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'John Doe',
        address: '123 Main St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'Q001',
        attending_doctor: 'Dr. Smith',
        phone: '123-456-7890',
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    testPatientId = patientResult[0].id;

    // Create test user (admin)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@hospital.com',
        password: 'password123',
        role: 'admin',
        phone: '987-654-3210'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;
  });

  const testInput: CreateOrderInput = {
    patient_id: 0, // Will be set in test
    medication_details: 'Paracetamol 500mg, 2x daily for 7 days',
    created_by: 0 // Will be set in test
  };

  it('should create an order', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      created_by: testUserId
    };

    const result = await createOrder(input);

    // Basic field validation
    expect(result.patient_id).toEqual(testPatientId);
    expect(result.medication_details).toEqual('Paracetamol 500mg, 2x daily for 7 days');
    expect(result.created_by).toEqual(testUserId);
    expect(result.status).toEqual('pending');
    expect(result.assigned_courier_id).toBeNull();
    expect(result.delivery_distance).toBeNull();
    expect(result.delivery_fee).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save order to database', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      created_by: testUserId
    };

    const result = await createOrder(input);

    // Query using proper drizzle syntax
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].patient_id).toEqual(testPatientId);
    expect(orders[0].medication_details).toEqual('Paracetamol 500mg, 2x daily for 7 days');
    expect(orders[0].created_by).toEqual(testUserId);
    expect(orders[0].status).toEqual('pending');
    expect(orders[0].created_at).toBeInstanceOf(Date);
    expect(orders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when patient does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: 999999, // Non-existent patient ID
      created_by: testUserId
    };

    expect(createOrder(input)).rejects.toThrow(/patient not found/i);
  });

  it('should throw error when creator user does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      created_by: 999999 // Non-existent user ID
    };

    expect(createOrder(input)).rejects.toThrow(/creator user not found/i);
  });

  it('should handle numeric fields correctly', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      created_by: testUserId
    };

    const result = await createOrder(input);

    // Verify numeric fields are properly typed
    expect(typeof result.delivery_distance).toBe('object'); // null
    expect(typeof result.delivery_fee).toBe('object'); // null
    expect(result.delivery_distance).toBeNull();
    expect(result.delivery_fee).toBeNull();
  });
});
