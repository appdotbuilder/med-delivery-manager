
import { serial, text, pgTable, timestamp, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'hospital_staff', 'courier', 'patient']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'obat_siap', 'assigned_courier', 'in_transit', 'delivered', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull(),
  phone: text('phone'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Patients table
export const patientsTable = pgTable('patients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  date_of_birth: timestamp('date_of_birth').notNull(),
  queue_number: text('queue_number').notNull(),
  attending_doctor: text('attending_doctor').notNull(),
  phone: text('phone'),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull(),
  medication_details: text('medication_details').notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  created_by: integer('created_by').notNull(),
  assigned_courier_id: integer('assigned_courier_id'),
  delivery_distance: numeric('delivery_distance', { precision: 10, scale: 2 }),
  delivery_fee: numeric('delivery_fee', { precision: 10, scale: 2 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Delivery tracking table
export const deliveryTrackingTable = pgTable('delivery_tracking', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull(),
  status: orderStatusEnum('status').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  notes: text('notes'),
  updated_by: integer('updated_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdOrders: many(ordersTable, { relationName: 'creator' }),
  assignedOrders: many(ordersTable, { relationName: 'courier' }),
  deliveryUpdates: many(deliveryTrackingTable),
}));

export const patientsRelations = relations(patientsTable, ({ many }) => ({
  orders: many(ordersTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [ordersTable.patient_id],
    references: [patientsTable.id],
  }),
  creator: one(usersTable, {
    fields: [ordersTable.created_by],
    references: [usersTable.id],
    relationName: 'creator',
  }),
  assignedCourier: one(usersTable, {
    fields: [ordersTable.assigned_courier_id],
    references: [usersTable.id],
    relationName: 'courier',
  }),
  trackingHistory: many(deliveryTrackingTable),
}));

export const deliveryTrackingRelations = relations(deliveryTrackingTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [deliveryTrackingTable.order_id],
    references: [ordersTable.id],
  }),
  updatedBy: one(usersTable, {
    fields: [deliveryTrackingTable.updated_by],
    references: [usersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  patients: patientsTable,
  orders: ordersTable,
  deliveryTracking: deliveryTrackingTable,
};

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Patient = typeof patientsTable.$inferSelect;
export type NewPatient = typeof patientsTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;
export type DeliveryTracking = typeof deliveryTrackingTable.$inferSelect;
export type NewDeliveryTracking = typeof deliveryTrackingTable.$inferInsert;
