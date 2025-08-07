
import { db } from '../db';
import { ordersTable, patientsTable, usersTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  try {
    // Verify the patient exists
    const patient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.patient_id))
      .execute();

    if (patient.length === 0) {
      throw new Error('Patient not found');
    }

    // Verify the creator (user) exists and has appropriate role
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (creator.length === 0) {
      throw new Error('Creator user not found');
    }

    // Insert order record
    const result = await db.insert(ordersTable)
      .values({
        patient_id: input.patient_id,
        medication_details: input.medication_details,
        created_by: input.created_by,
        status: 'pending', // Default status
        assigned_courier_id: null,
        delivery_distance: null,
        delivery_fee: null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      delivery_distance: order.delivery_distance ? parseFloat(order.delivery_distance) : null,
      delivery_fee: order.delivery_fee ? parseFloat(order.delivery_fee) : null
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};
