
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, patientsTable, ordersTable, deliveryTrackingTable } from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCourierId: number;
  let testPatientId: number;
  let testOrderId: number;

  beforeEach(async () => {
    // Create test admin user
    const adminResult = await db.insert(usersTable)
      .values({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: null
      })
      .returning()
      .execute();
    testUserId = adminResult[0].id;

    // Create test courier
    const courierResult = await db.insert(usersTable)
      .values({
        name: 'Test Courier',
        email: 'courier@test.com',
        password: 'password123',
        role: 'courier',
        phone: '555-0123'
      })
      .returning()
      .execute();
    testCourierId = courierResult[0].id;

    // Create test patient with location
    const patientResult = await db.insert(patientsTable)
      .values({
        name: 'Test Patient',
        address: '123 Test St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'Q001',
        attending_doctor: 'Dr. Smith',
        phone: '555-0456',
        latitude: '-6.2088',
        longitude: '106.8456'
      })
      .returning()
      .execute();
    testPatientId = patientResult[0].id;

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        patient_id: testPatientId,
        medication_details: 'Test medication',
        status: 'pending',
        created_by: testUserId,
        assigned_courier_id: null,
        delivery_distance: null,
        delivery_fee: null
      })
      .returning()
      .execute();
    testOrderId = orderResult[0].id;
  });

  it('should update order status to obat_siap', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: testOrderId,
      status: 'obat_siap',
      updated_by: testUserId
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(testOrderId);
    expect(result.status).toEqual('obat_siap');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.assigned_courier_id).toBeNull();
  });

  it('should assign courier and calculate delivery fee', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: testOrderId,
      status: 'assigned_courier',
      updated_by: testUserId,
      assigned_courier_id: testCourierId
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(testOrderId);
    expect(result.status).toEqual('assigned_courier');
    expect(result.assigned_courier_id).toEqual(testCourierId);
    expect(result.delivery_distance).toBeDefined();
    expect(result.delivery_fee).toBeDefined();
    expect(typeof result.delivery_distance).toBe('number');
    expect(typeof result.delivery_fee).toBe('number');
    expect(result.delivery_fee).toBeGreaterThanOrEqual(5.0); // Minimum fee
  });

  it('should update order status with location tracking', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: testOrderId,
      status: 'in_transit',
      updated_by: testCourierId,
      latitude: -6.2000,
      longitude: 106.8400,
      notes: 'Package picked up'
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(testOrderId);
    expect(result.status).toEqual('in_transit');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create delivery tracking record', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: testOrderId,
      status: 'delivered',
      updated_by: testCourierId,
      latitude: -6.2088,
      longitude: 106.8456,
      notes: 'Package delivered successfully'
    };

    await updateOrderStatus(input);

    // Verify tracking record was created
    const trackingRecords = await db.select()
      .from(deliveryTrackingTable)
      .where(eq(deliveryTrackingTable.order_id, testOrderId))
      .execute();

    expect(trackingRecords).toHaveLength(1);
    const tracking = trackingRecords[0];
    expect(tracking.status).toEqual('delivered');
    expect(tracking.updated_by).toEqual(testCourierId);
    expect(tracking.notes).toEqual('Package delivered successfully');
    expect(parseFloat(tracking.latitude!)).toEqual(-6.2088);
    expect(parseFloat(tracking.longitude!)).toEqual(106.8456);
    expect(tracking.created_at).toBeInstanceOf(Date);
  });

  it('should update order in database', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: testOrderId,
      status: 'cancelled',
      updated_by: testUserId,
      notes: 'Patient cancelled order'
    };

    await updateOrderStatus(input);

    // Verify order was updated in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, testOrderId))
      .execute();

    expect(orders).toHaveLength(1);
    const order = orders[0];
    expect(order.status).toEqual('cancelled');
    expect(order.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent order', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: 99999,
      status: 'delivered',
      updated_by: testUserId
    };

    expect(updateOrderStatus(input)).rejects.toThrow(/order.*not found/i);
  });

  it('should handle status update without courier assignment', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: testOrderId,
      status: 'assigned_courier',
      updated_by: testUserId
      // No assigned_courier_id provided
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('assigned_courier');
    expect(result.assigned_courier_id).toBeNull();
    expect(result.delivery_fee).toBeNull();
    expect(result.delivery_distance).toBeNull();
  });
});
