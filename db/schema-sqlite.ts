import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const services = sqliteTable("services", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: text("price", { length: 50 }),
  imageUrl: text("imageUrl", { length: 500 }),
  image_url: text("image_url", { length: 500 }), // Для совместимости
  orderDesktop: integer("orderDesktop").notNull().default(0),
  orderMobile: integer("orderMobile").notNull().default(0),
  duration: integer("duration").notNull().default(60),
  badgeText: text("badgeText", { length: 50 }),
  badgeType: text("badgeType", { length: 20 }),
  executorRole: text("executorRole", { length: 255 }),
  category: text("category", { length: 255 }),
});

// Таблица администраторов
export const admins = sqliteTable("admins", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username", { length: 255 }).notNull().unique(),
  passwordHash: text("passwordHash", { length: 255 }).notNull(),
  name: text("name", { length: 255 }).notNull(),
  telegramId: text("telegramId", { length: 50 }),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
});

// Таблица мастеров
export const masters = sqliteTable("masters", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  fullName: text("fullName", { length: 255 }).notNull(),
  specialization: text("specialization", { length: 255 }).notNull(),
  telegramId: text("telegramId", { length: 50 }),
  phone: text("phone", { length: 50 }),
  staffPassword: text("staffPassword", { length: 255 }),
  photoUrl: text("photoUrl", { length: 500 }),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  showOnSite: integer("showOnSite", { mode: "boolean" }).default(true).notNull(),
  notificationSettings: text("notificationSettings"),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
});

// Таблица записей
export const appointments = sqliteTable("appointments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  masterId: integer("masterId", { mode: "number" }).notNull(),
  serviceId: integer("serviceId", { mode: "number" }).notNull(),
  appointmentDate: text("appointmentDate").notNull(),
  startTime: text("startTime").notNull(),
  endTime: text("endTime").notNull(),
  clientName: text("clientName").notNull(),
  clientPhone: text("clientPhone"),
  clientTelegramId: text("clientTelegramId"),
  status: text("status").default("confirmed").notNull(),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
});

// Таблица рабочих слотов
export const workSlots = sqliteTable("workSlots", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  masterId: integer("masterId", { mode: "number" }).notNull(),
  workDate: text("workDate").notNull(),
  startTime: text("startTime").notNull(),
  endTime: text("endTime").notNull(),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
  createdBy: text("createdBy", { length: 255 }),
  isConfirmed: integer("isConfirmed", { mode: "boolean" }).default(false).notNull(),
  adminUpdateStatus: text("adminUpdateStatus", { length: 20 }),
});

// Таблица запросов на изменение рабочих слотов
export const workSlotChangeRequests = sqliteTable("workSlotChangeRequests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  workSlotId: integer("workSlotId", { mode: "number" }).notNull(),
  masterId: integer("masterId", { mode: "number" }).notNull(),
  type: text("type").notNull(),
  suggestedWorkDate: text("suggestedWorkDate"),
  suggestedStartTime: text("suggestedStartTime"),
  suggestedEndTime: text("suggestedEndTime"),
  requestedStartTime: text("requestedStartTime"),
  requestedEndTime: text("requestedEndTime"),
  status: text("status").default("pending").notNull(),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
});

// Таблица клиентов (зарегистрированные пользователи)
export const clients = sqliteTable("clients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  phone: text("phone", { length: 50 }).notNull(),
  email: text("email", { length: 255 }),
  password: text("password", { length: 255 }),
  telegramId: text("telegramId", { length: 50 }),
  verificationCode: text("verificationCode", { length: 20 }),
  isVerified: integer("isVerified", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
  verifiedAt: text("verifiedAt"),
});

// Временная таблица для регистрации до подтверждения через Telegram
export const pendingClients = sqliteTable("pendingClients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  phone: text("phone", { length: 50 }).notNull().unique(),
  email: text("email", { length: 255 }),
  password: text("password", { length: 255 }),
  verificationCode: text("verificationCode", { length: 20 }).notNull().unique(),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
});

// Временная таблица для кодов подтверждения из Telegram
export const telegramVerificationCodes = sqliteTable("telegramVerificationCodes", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  code: text("code", { length: 10 }).notNull().unique(),
  telegramId: text("telegramId", { length: 50 }).notNull(),
  phone: text("phone", { length: 50 }),
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
  expiresAt: text("expiresAt").notNull(),
  isUsed: integer("isUsed", { mode: "boolean" }).default(false).notNull(),
});

// Таблица для отслеживания отправленных напоминаний
export const reminderSent = sqliteTable("reminderSent", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointmentId", { mode: "number" }).notNull(),
  sentAt: text("sentAt").default(new Date().toISOString()).notNull(),
  reminderType: text("reminderType", { length: 20 }).default("1hour").notNull(),
});

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
