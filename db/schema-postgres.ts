import { pgTable, text, varchar, serial, integer, boolean } from "drizzle-orm/pg-core";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 50 }),
  imageUrl: varchar("imageUrl", { length: 500 }),
  orderDesktop: integer("orderDesktop").notNull().default(0),
  orderMobile: integer("orderMobile").notNull().default(0),
  duration: integer("duration").notNull().default(60),
  badgeText: varchar("badgeText", { length: 50 }),
  badgeType: varchar("badgeType", { length: 20 }),
  executorRole: varchar("executorRole", { length: 255 }),
  category: varchar("category", { length: 255 }),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  telegramId: varchar("telegramId", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: text("createdAt").notNull(),
});

export const masters = pgTable("masters", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  telegramId: varchar("telegramId", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  staffPassword: varchar("staffPassword", { length: 255 }),
  photoUrl: varchar("photoUrl", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  showOnSite: boolean("showOnSite").default(true).notNull(),
  notificationSettings: text("notificationSettings"),
  createdAt: text("createdAt").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  serviceId: integer("serviceId").notNull(),
  appointmentDate: varchar("appointmentDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 50 }),
  clientTelegramId: varchar("clientTelegramId", { length: 50 }),
  status: varchar("status", { length: 20 }).default("confirmed").notNull(),
  createdAt: text("createdAt").notNull(),
});

export const workSlots = pgTable("workSlots", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  workDate: varchar("workDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  createdAt: text("createdAt").notNull(),
  createdBy: varchar("createdBy", { length: 255 }),
  isConfirmed: boolean("isConfirmed").default(false).notNull(),
  adminUpdateStatus: varchar("adminUpdateStatus", { length: 20 }),
});

export const workSlotChangeRequests = pgTable("workSlotChangeRequests", {
  id: serial("id").primaryKey(),
  workSlotId: integer("workSlotId").notNull(),
  masterId: integer("masterId").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  suggestedWorkDate: varchar("suggestedWorkDate", { length: 10 }),
  suggestedStartTime: varchar("suggestedStartTime", { length: 5 }),
  suggestedEndTime: varchar("suggestedEndTime", { length: 5 }),
  requestedStartTime: varchar("requestedStartTime", { length: 5 }),
  requestedEndTime: varchar("requestedEndTime", { length: 5 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: text("createdAt").notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }),
  telegramId: varchar("telegramId", { length: 50 }),
  verificationCode: varchar("verificationCode", { length: 20 }),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: text("createdAt").notNull(),
  verifiedAt: text("verifiedAt"),
});

export const pendingClients = pgTable("pendingClients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }),
  verificationCode: varchar("verificationCode", { length: 20 }).notNull().unique(),
  createdAt: text("createdAt").notNull(),
});

export const telegramVerificationCodes = pgTable("telegramVerificationCodes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  telegramId: varchar("telegramId", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  createdAt: text("createdAt").notNull(),
  expiresAt: text("expiresAt").notNull(),
  isUsed: boolean("isUsed").default(false).notNull(),
});

export const reminderSent = pgTable("reminderSent", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointmentId").notNull(),
  sentAt: text("sentAt").notNull(),
  reminderType: varchar("reminderType", { length: 20 }).default("1hour").notNull(),
});

export const scheduleOptimizations = pgTable("scheduleOptimizations", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  workDate: varchar("workDate", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdAt: text("createdAt").notNull(),
  sentAt: text("sentAt"),
});

export const optimizationMoves = pgTable("optimizationMoves", {
  id: serial("id").primaryKey(),
  optimizationId: integer("optimizationId").notNull(),
  appointmentId: integer("appointmentId").notNull(),
  oldStartTime: varchar("oldStartTime", { length: 5 }).notNull(),
  oldEndTime: varchar("oldEndTime", { length: 5 }).notNull(),
  newStartTime: varchar("newStartTime", { length: 5 }).notNull(),
  newEndTime: varchar("newEndTime", { length: 5 }).notNull(),
  clientResponse: varchar("clientResponse", { length: 20 }).notNull().default("pending"),
  sentAt: text("sentAt"),
});

export const adminSettings = pgTable("adminSettings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value"),
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
