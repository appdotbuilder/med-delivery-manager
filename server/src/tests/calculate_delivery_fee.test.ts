
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { calculateDeliveryFee } from '../handlers/calculate_delivery_fee';

describe('calculateDeliveryFee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate fee for zero distance', async () => {
    const result = await calculateDeliveryFee(0);
    
    expect(result).toEqual(5000); // Base fee only
    expect(typeof result).toBe('number');
  });

  it('should calculate fee for short distance', async () => {
    const result = await calculateDeliveryFee(2.5);
    
    // Base fee (5000) + (2.5 * 2000) = 10000
    expect(result).toEqual(10000);
  });

  it('should calculate fee for long distance', async () => {
    const result = await calculateDeliveryFee(15);
    
    // Base fee (5000) + (15 * 2000) = 35000
    expect(result).toEqual(35000);
  });

  it('should round fractional fees correctly', async () => {
    const result = await calculateDeliveryFee(1.3);
    
    // Base fee (5000) + (1.3 * 2000) = 7600
    expect(result).toEqual(7600);
  });

  it('should handle decimal distance with rounding', async () => {
    const result = await calculateDeliveryFee(0.001);
    
    // Base fee (5000) + (0.001 * 2000) = 5002, rounded to 5002
    expect(result).toEqual(5002);
  });

  it('should throw error for negative distance', async () => {
    await expect(calculateDeliveryFee(-1)).rejects.toThrow(/distance cannot be negative/i);
  });

  it('should return number type for all valid inputs', async () => {
    const results = await Promise.all([
      calculateDeliveryFee(0),
      calculateDeliveryFee(5.5),
      calculateDeliveryFee(100)
    ]);

    results.forEach(result => {
      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true); // Should be rounded to integer
    });
  });
});
