
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { getPatients } from '../handlers/get_patients';

describe('getPatients', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no patients exist', async () => {
    const result = await getPatients();
    expect(result).toEqual([]);
  });

  it('should return all patients', async () => {
    // Create test patients
    await db.insert(patientsTable).values([
      {
        name: 'John Doe',
        address: '123 Main St',
        date_of_birth: new Date('1990-01-01'),
        queue_number: 'A001',
        attending_doctor: 'Dr. Smith',
        phone: '+1234567890',
        latitude: '40.7128',
        longitude: '-74.0060'
      },
      {
        name: 'Jane Smith',
        address: '456 Oak Ave',
        date_of_birth: new Date('1985-06-15'),
        queue_number: 'A002',
        attending_doctor: 'Dr. Johnson',
        phone: null,
        latitude: null,
        longitude: null
      }
    ]).execute();

    const result = await getPatients();

    expect(result).toHaveLength(2);
    
    // Verify first patient
    const patient1 = result.find(p => p.name === 'John Doe');
    expect(patient1).toBeDefined();
    expect(patient1!.address).toEqual('123 Main St');
    expect(patient1!.queue_number).toEqual('A001');
    expect(patient1!.attending_doctor).toEqual('Dr. Smith');
    expect(patient1!.phone).toEqual('+1234567890');
    expect(patient1!.latitude).toEqual(40.7128);
    expect(patient1!.longitude).toEqual(-74.0060);
    expect(typeof patient1!.latitude).toBe('number');
    expect(typeof patient1!.longitude).toBe('number');
    expect(patient1!.date_of_birth).toBeInstanceOf(Date);
    expect(patient1!.created_at).toBeInstanceOf(Date);

    // Verify second patient (with null coordinates)
    const patient2 = result.find(p => p.name === 'Jane Smith');
    expect(patient2).toBeDefined();
    expect(patient2!.address).toEqual('456 Oak Ave');
    expect(patient2!.queue_number).toEqual('A002');
    expect(patient2!.attending_doctor).toEqual('Dr. Johnson');
    expect(patient2!.phone).toBeNull();
    expect(patient2!.latitude).toBeNull();
    expect(patient2!.longitude).toBeNull();
    expect(patient2!.date_of_birth).toBeInstanceOf(Date);
    expect(patient2!.created_at).toBeInstanceOf(Date);
  });

  it('should handle numeric coordinate conversion correctly', async () => {
    // Create patient with specific coordinates
    await db.insert(patientsTable).values({
      name: 'Test Patient',
      address: '789 Test St',
      date_of_birth: new Date('1995-03-20'),
      queue_number: 'T001',
      attending_doctor: 'Dr. Test',
      phone: '+9876543210',
      latitude: '37.7749',
      longitude: '-122.4194'
    }).execute();

    const result = await getPatients();

    expect(result).toHaveLength(1);
    const patient = result[0];
    
    // Verify numeric conversion
    expect(typeof patient.latitude).toBe('number');
    expect(typeof patient.longitude).toBe('number');
    expect(patient.latitude).toEqual(37.7749);
    expect(patient.longitude).toEqual(-122.4194);
  });
});
