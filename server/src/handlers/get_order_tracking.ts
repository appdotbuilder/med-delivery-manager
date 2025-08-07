
import { db } from '../db';
import { deliveryTrackingTable } from '../db/schema';
import { type GetOrderTrackingInput, type DeliveryTracking } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getOrderTracking(input: GetOrderTrackingInput): Promise<DeliveryTracking[]> {
  try {
    const results = await db.select()
      .from(deliveryTrackingTable)
      .where(eq(deliveryTrackingTable.order_id, input.order_id))
      .orderBy(desc(deliveryTrackingTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(tracking => ({
      ...tracking,
      latitude: tracking.latitude ? parseFloat(tracking.latitude) : null,
      longitude: tracking.longitude ? parseFloat(tracking.longitude) : null
    }));
  } catch (error) {
    console.error('Failed to fetch order tracking:', error);
    throw error;
  }
}
