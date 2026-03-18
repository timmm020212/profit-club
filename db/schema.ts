import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 50 }),
  imageUrl: varchar("image_url", { length: 500 }),
  orderDesktop: integer("order_desktop").notNull().default(0),
  orderMobile: integer("order_mobile").notNull().default(0),
  duration: integer("duration").notNull().default(60),
  badgeText: varchar("badge_text", { length: 50 }),
  badgeType: varchar("badge_type", { length: 20 }),
  executorRole: varchar("executor_role", { length: 255 }),
  category: varchar("category", { length: 255 }),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  telegramId: varchar("telegram_id", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const masters = pgTable("masters", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  telegramId: varchar("telegram_id", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  staffPassword: varchar("staff_password", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull(),
  serviceId: integer("service_id").notNull(),
  appointmentDate: varchar("appointment_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientTelegramId: varchar("client_telegram_id", { length: 50 }),
  status: varchar("status", { length: 20 }).default("confirmed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workSlots = pgTable("work_slots", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull(),
  workDate: varchar("work_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 50 }),
  isConfirmed: boolean("is_confirmed").default(false).notNull(),
  adminUpdateStatus: varchar("admin_update_status", { length: 20 }),
});

export const workSlotChangeRequests = pgTable("work_slot_change_requests", {
  id: serial("id").primaryKey(),
  workSlotId: integer("work_slot_id").notNull(),
  masterId: integer("master_id").notNull(),
  type: varchar("type", { length: 30 }).notNull().default("time_change"),
  suggestedWorkDate: varchar("suggested_work_date", { length: 10 }),
  suggestedStartTime: varchar("suggested_start_time", { length: 5 }),
  suggestedEndTime: varchar("suggested_end_time", { length: 5 }),
  requestedStartTime: varchar("requested_start_time", { length: 5 }),
  requestedEndTime: varchar("requested_end_time", { length: 5 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }),
  telegramId: varchar("telegram_id", { length: 50 }),
  verificationCode: varchar("verification_code", { length: 20 }),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

export const pendingClients = pgTable("pending_clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }),
  verificationCode: varchar("verification_code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const telegramVerificationCodes = pgTable("telegram_verification_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  telegramId: varchar("telegram_id", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
});

export const reminderSent = pgTable("reminder_sent", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  reminderType: varchar("reminder_type", { length: 20 }).default("1hour").notNull(),
});

// Types
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type Master = typeof masters.$inferSelect;
export type NewMaster = typeof masters.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type WorkSlot = typeof workSlots.$inferSelect;
export type NewWorkSlot = typeof workSlots.$inferInsert;
export type WorkSlotChangeRequest = typeof workSlotChangeRequests.$inferSelect;
export type NewWorkSlotChangeRequest = typeof workSlotChangeRequests.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type PendingClient = typeof pendingClients.$inferSelect;
export type NewPendingClient = typeof pendingClients.$inferInsert;
export type TelegramVerificationCode = typeof telegramVerificationCodes.$inferSelect;
export type NewTelegramVerificationCode = typeof telegramVerificationCodes.$inferInsert;
export type ReminderSent = typeof reminderSent.$inferSelect;
export type NewReminderSent = typeof reminderSent.$inferInsert;

// Relations
export const mastersRelations = relations(masters, ({ many }) => ({
  workSlots: many(workSlots),
  appointments: many(appointments),
}));

export const workSlotsRelations = relations(workSlots, ({ one }) => ({
  master: one(masters, { fields: [workSlots.masterId], references: [masters.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  master: one(masters, { fields: [appointments.masterId], references: [masters.id] }),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
}));
