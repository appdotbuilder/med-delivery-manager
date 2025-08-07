
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, patientsTable, ordersTable } from '../db/schema';
import { type GetUserOrdersInput } from '../schema';
import { getUserOrders } from '../handlers/get_user_orders';

describe('getUserOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all orders for admin users', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Test',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patientId = patientResult[0].id;

    // Create multiple orders
    await db.insert(ordersTable)
      .values([
        {
          patient_id: patientId,
          medication_details: 'Medicine A',
          created_by: adminId,
          status: 'pending'
        },
        {
          patient_id: patientId,
          medication_details: 'Medicine B',
          created_by: adminId,
          status: 'obat_siap'
        }
      ])
      .execute();

    const input: GetUserOrdersInput = {
      user_id: adminId,
      role: 'admin'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(2);
    expect(result[0].medication_details).toEqual('Medicine A');
    expect(result[1].medication_details).toEqual('Medicine B');
    expect(result[0].status).toEqual('pending');
    expect(result[1].status).toEqual('obat_siap');
  });

  it('should return all orders for hospital staff users', async () => {
    // Create hospital staff user
    const staffResult = await db.insert(usersTable)
      .values({
        name: 'Hospital Staff',
        email: 'staff@test.com',
        password: 'password123',
        role: 'hospital_staff',
        phone: null
      })
      .returning()
      .execute();
    const staffId = staffResult[0].id;

    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Test',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patientId = patientResult[0].id;

    // Create order
    await db.insert(ordersTable)
      .values({
        patient_id: patientId,
        medication_details: 'Medicine A',
        created_by: staffId,
        status: 'pending'
      })
      .execute();

    const input: GetUserOrdersInput = {
      user_id: staffId,
      role: 'hospital_staff'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].medication_details).toEqual('Medicine A');
    expect(result[0].status).toEqual('pending');
  });

  it('should return only assigned orders for courier users', async () => {
    // Create admin and courier users
    const adminResult = await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    const courierResult = await db.insert(usersTable)
      .values({
        name: 'Courier User',
        email: 'courier@test.com',
        password: 'password123',
        role: 'courier',
        phone: null
      })
      .returning()
      .execute();
    const courierId = courierResult[0].id;

    const otherCourierResult = await db.insert(usersTable)
      .values({
        name: 'Other Courier',
        email: 'other@test.com',
        password: 'password123',
        role: 'courier',
        phone: null
      })
      .returning()
      .execute();
    const otherCourierId = otherCourierResult[0].id;

    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Test',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patientId = patientResult[0].id;

    // Create orders with different courier assignments
    await db.insert(ordersTable)
      .values([
        {
          patient_id: patientId,
          medication_details: 'Medicine A - Assigned to courier',
          created_by: adminId,
          assigned_courier_id: courierId,
          status: 'assigned_courier'
        },
        {
          patient_id: patientId,
          medication_details: 'Medicine B - Assigned to other courier',
          created_by: adminId,
          assigned_courier_id: otherCourierId,
          status: 'assigned_courier'
        },
        {
          patient_id: patientId,
          medication_details: 'Medicine C - No courier assigned',
          created_by: adminId,
          status: 'pending'
        }
      ])
      .execute();

    const input: GetUserOrdersInput = {
      user_id: courierId,
      role: 'courier'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].medication_details).toEqual('Medicine A - Assigned to courier');
    expect(result[0].assigned_courier_id).toEqual(courierId);
    expect(result[0].status).toEqual('assigned_courier');
  });

  it('should return only patient orders for patient users', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create patients
    const patient1Result = await db.insert(patientsTable)
      .values({
        name: 'Patient 1',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Test',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patient1Id = patient1Result[0].id;

    const patient2Result = await db.insert(patientsTable)
      .values({
        name: 'Patient 2',
        address: '456 Test Ave',
        date_of_birth: new Date('1985-05-05'),
        queue_number: 'B002',
        attending_doctor: 'Dr. Smith',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patient2Id = patient2Result[0].id;

    // Create orders for different patients
    await db.insert(ordersTable)
      .values([
        {
          patient_id: patient1Id,
          medication_details: 'Medicine for Patient 1',
          created_by: adminId,
          status: 'pending'
        },
        {
          patient_id: patient2Id,
          medication_details: 'Medicine for Patient 2',
          created_by: adminId,
          status: 'obat_siap'
        }
      ])
      .execute();

    const input: GetUserOrdersInput = {
      user_id: patient1Id, // Assuming patient_id matches user_id
      role: 'patient'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].medication_details).toEqual('Medicine for Patient 1');
    expect(result[0].patient_id).toEqual(patient1Id);
    expect(result[0].status).toEqual('pending');
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Test',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patientId = patientResult[0].id;

    // Create order with numeric fields
    await db.insert(ordersTable)
      .values({
        patient_id: patientId,
        medication_details: 'Medicine with delivery',
        created_by: adminId,
        status: 'pending',
        delivery_distance: (5.75).toString(), // Convert to string for storage
        delivery_fee: (15.50).toString() // Convert to string for storage
      })
      .execute();

    const input: GetUserOrdersInput = {
      user_id: adminId,
      role: 'admin'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    expect(typeof result[0].delivery_distance).toBe('number');
    expect(typeof result[0].delivery_fee).toBe('number');
    expect(result[0].delivery_distance).toEqual(5.75);
    expect(result[0].delivery_fee).toEqual(15.50);
  });

  it('should return empty array when courier has no assigned orders', async () => {
    // Create courier user
    const courierResult = await db.insert(usersTable)
      .values({
        name: 'Courier User',
        email: 'courier@test.com',
        password: 'password123',
        role: 'courier',
        phone: null
      })
      .returning()
      .execute();
    const courierId = courierResult[0].id;

    const input: GetUserOrdersInput = {
      user_id: courierId,
      role: 'courier'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when patient has no orders', async () => {
    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Test',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();
    const patientId = patientResult[0].id;

    const input: GetUserOrdersInput = {
      user_id: patientId,
      role: 'patient'
    };

    const result = await getUserOrders(input);

    expect(result).toHaveLength(0);
  });
});
