
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput, type Patient } from '../schema';

export const createPatient = async (input: CreatePatientInput): Promise<Patient> => {
  try {
    // Insert patient record
    const result = await db.insert(patientsTable)
      .values({
        name: input.name,
        address: input.address,
        date_of_birth: new Date(input.date_of_birth),
        queue_number: input.queue_number,
        attending_doctor: input.attending_doctor,
        phone: input.phone,
        latitude: input.latitude ? input.latitude.toString() : null, // Convert number to string for numeric column
        longitude: input.longitude ? input.longitude.toString() : null // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const patient = result[0];
    return {
      ...patient,
      latitude: patient.latitude ? parseFloat(patient.latitude) : null, // Convert string back to number
      longitude: patient.longitude ? parseFloat(patient.longitude) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Patient creation failed:', error);
    throw error;
  }
};
