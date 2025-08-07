
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type Patient } from '../schema';

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const results = await db.select()
      .from(patientsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(patient => ({
      ...patient,
      latitude: patient.latitude ? parseFloat(patient.latitude) : null,
      longitude: patient.longitude ? parseFloat(patient.longitude) : null
    }));
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    throw error;
  }
};
