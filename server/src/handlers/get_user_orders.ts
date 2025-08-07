
import { db } from '../db';
import { ordersTable, patientsTable, usersTable } from '../db/schema';
import { type GetUserOrdersInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserOrders(input: GetUserOrdersInput): Promise<Order[]> {
  try {
    let results: any[];

    if (input.role === 'courier') {
      // Couriers only see orders assigned to them
      results = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.assigned_courier_id, input.user_id))
        .execute();
    } else if (input.role === 'patient') {
      // Patients only see their own orders - need to join with patients table
      // For now, we'll assume patient_id matches user_id directly
      // In a real system, you'd need a proper user-patient relationship
      results = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.patient_id, input.user_id))
        .execute();
    } else {
      // Admin and hospital_staff see all orders
      results = await db.select()
        .from(ordersTable)
        .execute();
    }

    // Convert numeric fields from strings to numbers
    return results.map(result => ({
      ...result,
      delivery_distance: result.delivery_distance ? parseFloat(result.delivery_distance) : null,
      delivery_fee: result.delivery_fee ? parseFloat(result.delivery_fee) : null
    }));
  } catch (error) {
    console.error('Failed to get user orders:', error);
    throw error;
  }
}
