
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput } from '../schema';
import { createPatient } from '../handlers/create_patient';
import { eq, gte } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreatePatientInput = {
  name: 'John Doe',
  address: '123 Main Street, Jakarta',
  date_of_birth: '1990-01-15',
  queue_number: 'A001',
  attending_doctor: 'Dr. Smith',
  phone: '+62812345678',
  latitude: -6.200000,
  longitude: 106.816666
};

// Test input without optional fields
const minimalInput: CreatePatientInput = {
  name: 'Jane Smith',
  address: '456 Oak Avenue, Surabaya',
  date_of_birth: '1985-03-22',
  queue_number: 'B002',
  attending_doctor: 'Dr. Johnson',
  phone: null,
  latitude: null,
  longitude: null
};

describe('createPatient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a patient with all fields', async () => {
    const result = await createPatient(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.address).toEqual('123 Main Street, Jakarta');
    expect(result.date_of_birth).toBeInstanceOf(Date);
    expect(result.date_of_birth.toISOString().split('T')[0]).toEqual('1990-01-15');
    expect(result.queue_number).toEqual('A001');
    expect(result.attending_doctor).toEqual('Dr. Smith');
    expect(result.phone).toEqual('+62812345678');
    expect(result.latitude).toEqual(-6.200000);
    expect(typeof result.latitude).toEqual('number');
    expect(result.longitude).toEqual(106.816666);
    expect(typeof result.longitude).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a patient with minimal fields', async () => {
    const result = await createPatient(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.address).toEqual('456 Oak Avenue, Surabaya');
    expect(result.date_of_birth).toBeInstanceOf(Date);
    expect(result.date_of_birth.toISOString().split('T')[0]).toEqual('1985-03-22');
    expect(result.queue_number).toEqual('B002');
    expect(result.attending_doctor).toEqual('Dr. Johnson');
    expect(result.phone).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save patient to database', async () => {
    const result = await createPatient(testInput);

    // Query using proper drizzle syntax
    const patients = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();

    expect(patients).toHaveLength(1);
    expect(patients[0].name).toEqual('John Doe');
    expect(patients[0].address).toEqual(testInput.address);
    expect(patients[0].date_of_birth).toBeInstanceOf(Date);
    expect(patients[0].queue_number).toEqual('A001');
    expect(patients[0].attending_doctor).toEqual('Dr. Smith');
    expect(patients[0].phone).toEqual('+62812345678');
    expect(parseFloat(patients[0].latitude!)).toEqual(-6.200000); // Convert string back to number for comparison
    expect(parseFloat(patients[0].longitude!)).toEqual(106.816666);
    expect(patients[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle date range queries correctly', async () => {
    // Create the timestamp BEFORE creating the patient
    const beforeCreate = new Date();
    
    // Create test patient
    await createPatient(testInput);

    // Query for patients created after our timestamp
    const patients = await db.select()
      .from(patientsTable)
      .where(gte(patientsTable.created_at, beforeCreate))
      .execute();

    expect(patients.length).toBeGreaterThan(0);
    patients.forEach(patient => {
      expect(patient.created_at).toBeInstanceOf(Date);
      expect(patient.created_at >= beforeCreate).toBe(true);
    });
  });

  it('should handle numeric coordinate conversion correctly', async () => {
    const result = await createPatient(testInput);

    // Verify numeric types are correct in returned object
    expect(typeof result.latitude).toEqual('number');
    expect(typeof result.longitude).toEqual('number');
    expect(result.latitude).toEqual(-6.200000);
    expect(result.longitude).toEqual(106.816666);

    // Verify database storage (as string) is handled correctly
    const patients = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();

    // Database stores as string, but we can parse back to number
    expect(typeof patients[0].latitude).toEqual('string');
    expect(typeof patients[0].longitude).toEqual('string');
    expect(parseFloat(patients[0].latitude!)).toEqual(-6.200000);
    expect(parseFloat(patients[0].longitude!)).toEqual(106.816666);
  });
});
