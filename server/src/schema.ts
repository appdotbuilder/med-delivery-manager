
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'hospital_staff', 'courier', 'patient']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: userRoleSchema,
  phone: z.string().nullable(),
  created_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Patient schema
export const patientSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  date_of_birth: z.coerce.date(),
  queue_number: z.string(),
  attending_doctor: z.string(),
  phone: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  created_at: z.coerce.date()
});
export type Patient = z.infer<typeof patientSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'obat_siap', 'assigned_courier', 'in_transit', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  medication_details: z.string(),
  status: orderStatusSchema,
  created_by: z.number(), // admin user id
  assigned_courier_id: z.number().nullable(),
  delivery_distance: z.number().nullable(),
  delivery_fee: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Order = z.infer<typeof orderSchema>;

// Delivery tracking schema
export const deliveryTrackingSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  status: orderStatusSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  notes: z.string().nullable(),
  updated_by: z.number(), // user id who made the update
  created_at: z.coerce.date()
});
export type DeliveryTracking = z.infer<typeof deliveryTrackingSchema>;

// Input schemas for creating records
export const createUserInputSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema,
  phone: z.string().nullable()
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createPatientInputSchema = z.object({
  name: z.string(),
  address: z.string(),
  date_of_birth: z.string(), // Input as string, will be converted to date
  queue_number: z.string(),
  attending_doctor: z.string(),
  phone: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable()
});
export type CreatePatientInput = z.infer<typeof createPatientInputSchema>;

export const createOrderInputSchema = z.object({
  patient_id: z.number(),
  medication_details: z.string(),
  created_by: z.number()
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  order_id: z.number(),
  status: orderStatusSchema,
  updated_by: z.number(),
  assigned_courier_id: z.number().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Login schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});
export type LoginInput = z.infer<typeof loginInputSchema>;

// Query schemas
export const getUserOrdersInputSchema = z.object({
  user_id: z.number(),
  role: userRoleSchema
});
export type GetUserOrdersInput = z.infer<typeof getUserOrdersInputSchema>;

export const getOrderTrackingInputSchema = z.object({
  order_id: z.number()
});
export type GetOrderTrackingInput = z.infer<typeof getOrderTrackingInputSchema>;
