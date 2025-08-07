
export const calculateDeliveryFee = async (distance: number): Promise<number> => {
  try {
    // Input validation
    if (distance < 0) {
      throw new Error('Distance cannot be negative');
    }

    // Tiered pricing structure
    const baseFee = 5000; // Base fee in rupiah
    const perKmRate = 2000; // Per km rate in rupiah
    
    // Calculate total fee
    const totalFee = baseFee + (distance * perKmRate);
    
    // Round to nearest rupiah (no decimal places for currency)
    return Math.round(totalFee);
  } catch (error) {
    console.error('Delivery fee calculation failed:', error);
    throw error;
  }
};
