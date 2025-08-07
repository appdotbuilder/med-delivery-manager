
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, patientsTable, ordersTable, deliveryTrackingTable } from '../db/schema';
import { type GetOrderTrackingInput } from '../schema';
import { getOrderTracking } from '../handlers/get_order_tracking';

describe('getOrderTracking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for non-existent order', async () => {
    const input: GetOrderTrackingInput = {
      order_id: 999
    };

    const result = await getOrderTracking(input);
    expect(result).toEqual([]);
  });

  it('should return tracking history for an order', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();

    const [patient] = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'Q001',
        attending_doctor: 'Dr. Smith',
        phone: '123-456-7890',
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();

    const [order] = await db.insert(ordersTable)
      .values({
        patient_id: patient.id,
        medication_details: 'Test medication',
        created_by: user.id,
        assigned_courier_id: null,
        delivery_distance: null,
        delivery_fee: null
      })
      .returning()
      .execute();

    // Create tracking records with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    await db.insert(deliveryTrackingTable)
      .values([
        {
          order_id: order.id,
          status: 'pending',
          latitude: '40.7128'.toString(), // Convert to string for numeric column
          longitude: '-74.0060'.toString(), // Convert to string for numeric column
          notes: 'Order created',
          updated_by: user.id,
          created_at: earlier
        },
        {
          order_id: order.id,
          status: 'obat_siap',
          latitude: null,
          longitude: null,
          notes: 'Medication ready',
          updated_by: user.id,
          created_at: now
        }
      ])
      .execute();

    const input: GetOrderTrackingInput = {
      order_id: order.id
    };

    const result = await getOrderTracking(input);

    expect(result).toHaveLength(2);
    
    // Should be ordered by created_at descending (newest first)
    expect(result[0].status).toEqual('obat_siap');
    expect(result[0].notes).toEqual('Medication ready');
    expect(result[0].latitude).toBeNull();
    expect(result[0].longitude).toBeNull();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].status).toEqual('pending');
    expect(result[1].notes).toEqual('Order created');
    expect(result[1].latitude).toEqual(40.7128); // Should be converted back to number
    expect(result[1].longitude).toEqual(-74.0060); // Should be converted back to number
    expect(typeof result[1].latitude).toBe('number');
    expect(typeof result[1].longitude).toBe('number');
    expect(result[1].created_at).toBeInstanceOf(Date);

    // Verify ordering - newer record should come first
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should handle tracking records without coordinates', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test Admin',
        email: 'admin2@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();

    const [patient] = await db.insert(patientsTable)
      .values({
        name: 'Test Patient 2',
        address: '456 Test Ave',
        date_of_birth: new Date('1985-05-15'),
        queue_number: 'Q002',
        attending_doctor: 'Dr. Johnson',
        phone: null,
        latitude: null,
        longitude: null
      })
      .returning()
      .execute();

    const [order] = await db.insert(ordersTable)
      .values({
        patient_id: patient.id,
        medication_details: 'Another test medication',
        created_by: user.id,
        assigned_courier_id: null,
        delivery_distance: null,
        delivery_fee: null
      })
      .returning()
      .execute();

    await db.insert(deliveryTrackingTable)
      .values({
        order_id: order.id,
        status: 'delivered',
        latitude: null,
        longitude: null,
        notes: 'Package delivered successfully',
        updated_by: user.id
      })
      .execute();

    const input: GetOrderTrackingInput = {
      order_id: order.id
    };

    const result = await getOrderTracking(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('delivered');
    expect(result[0].latitude).toBeNull();
    expect(result[0].longitude).toBeNull();
    expect(result[0].notes).toEqual('Package delivered successfully');
    expect(result[0].order_id).toEqual(order.id);
    expect(result[0].updated_by).toEqual(user.id);
  });
});
