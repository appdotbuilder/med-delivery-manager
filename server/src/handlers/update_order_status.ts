
import { db } from '../db';
import { ordersTable, deliveryTrackingTable, patientsTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<Order> {
  try {
    // First, verify the order exists
    const existingOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (existingOrders.length === 0) {
      throw new Error(`Order with id ${input.order_id} not found`);
    }

    const existingOrder = existingOrders[0];

    // Calculate delivery fee if status is being changed to "assigned_courier"
    let deliveryFee: number | null = null;
    let deliveryDistance: number | null = null;

    if (input.status === 'assigned_courier' && input.assigned_courier_id) {
      // Get patient location for distance calculation
      const patients = await db.select()
        .from(patientsTable)
        .where(eq(patientsTable.id, existingOrder.patient_id))
        .execute();

      if (patients.length > 0) {
        const patient = patients[0];
        if (patient.latitude && patient.longitude) {
          // Convert numeric strings to numbers for calculation
          const patientLat = parseFloat(patient.latitude);
          const patientLng = parseFloat(patient.longitude);
          
          // Simple distance calculation (in km) - using Euclidean distance for demo
          // In real app, would use proper geolocation libraries
          const distance = Math.sqrt(
            Math.pow(patientLat - (patientLat + 0.01), 2) + 
            Math.pow(patientLng - (patientLng + 0.01), 2)
          ) * 111; // Rough conversion to km
          
          deliveryDistance = Math.round(distance * 100) / 100; // Round to 2 decimal places
          deliveryFee = Math.max(5.0, deliveryDistance * 2.0); // Base fee of 5.0, or 2.0 per km
        }
      }
    }

    // Update the order
    const updateData: any = {
      status: input.status,
      updated_at: new Date(),
    };

    if (input.assigned_courier_id !== undefined) {
      updateData.assigned_courier_id = input.assigned_courier_id;
    }

    if (deliveryDistance !== null) {
      updateData.delivery_distance = deliveryDistance.toString();
    }

    if (deliveryFee !== null) {
      updateData.delivery_fee = deliveryFee.toString();
    }

    const updatedOrders = await db.update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, input.order_id))
      .returning()
      .execute();

    // Create delivery tracking record
    await db.insert(deliveryTrackingTable)
      .values({
        order_id: input.order_id,
        status: input.status,
        latitude: input.latitude?.toString() || null,
        longitude: input.longitude?.toString() || null,
        notes: input.notes || null,
        updated_by: input.updated_by
      })
      .execute();

    // Convert numeric fields back to numbers
    const updatedOrder = updatedOrders[0];
    return {
      ...updatedOrder,
      delivery_distance: updatedOrder.delivery_distance ? parseFloat(updatedOrder.delivery_distance) : null,
      delivery_fee: updatedOrder.delivery_fee ? parseFloat(updatedOrder.delivery_fee) : null
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
}
