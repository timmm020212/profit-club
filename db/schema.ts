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
  duration: integer("duration").notNull().default(60), // Длительность услуги в минутах
  badgeText: varchar("badge_text", { length: 50 }),
  badgeType: varchar("badge_type", { length: 20 }),
  executorRole: varchar("executor_role", { length: 255 }),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

// Таблица администраторов
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  telegramId: varchar("telegram_id", { length: 50 }), // Telegram ID администратора
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

// Таблица мастеров
export const masters = pgTable("masters", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  telegramId: varchar("telegram_id", { length: 50 }), // Telegram ID мастера (если есть)
  phone: varchar("phone", { length: 50 }), // Телефон мастера
  staffPassword: varchar("staff_password", { length: 255 }), // Пароль для входа мастера в staff-бот
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Master = typeof masters.$inferSelect;
export type NewMaster = typeof masters.$inferInsert;

// Таблица рабочих дней мастеров (администратор указывает рабочий день, например 8:00-18:00)
export const workSlots = pgTable("work_slots", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull().references(() => masters.id, { onDelete: "cascade" }),
  workDate: varchar("work_date", { length: 10 }).notNull(), // Дата работы в формате YYYY-MM-DD
  startTime: varchar("start_time", { length: 5 }).notNull(), // Время начала рабочего дня в формате HH:MM (например, 08:00)
  endTime: varchar("end_time", { length: 5 }).notNull(), // Время окончания рабочего дня в формате HH:MM (например, 18:00)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 50 }), // Telegram ID администратора, который создал рабочий день
  isConfirmed: boolean("is_confirmed").default(false).notNull(), // Подтверждён ли мастером
  adminUpdateStatus: varchar("admin_update_status", { length: 20 }), // pending | accepted | rejected
});

// Таблица записей клиентов
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull().references(() => masters.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  appointmentDate: varchar("appointment_date", { length: 10 }).notNull(), // Дата записи в формате YYYY-MM-DD
  startTime: varchar("start_time", { length: 5 }).notNull(), // Время начала записи в формате HH:MM
  endTime: varchar("end_time", { length: 5 }).notNull(), // Время окончания записи в формате HH:MM
  clientName: varchar("client_name", { length: 255 }).notNull(), // Имя клиента
  clientPhone: varchar("client_phone", { length: 50 }), // Телефон клиента
  clientTelegramId: varchar("client_telegram_id", { length: 50 }), // Telegram ID клиента (если есть)
  status: varchar("status", { length: 20 }).default("confirmed").notNull(), // Статус: confirmed, cancelled, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkSlot = typeof workSlots.$inferSelect;
export type NewWorkSlot = typeof workSlots.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Таблица клиентов (зарегистрированные пользователи сайта)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }), // Хеш пароля
  telegramId: varchar("telegram_id", { length: 50 }), // Telegram ID клиента (после подтверждения)
  verificationCode: varchar("verification_code", { length: 20 }), // Уникальный код для подтверждения через Telegram
  isVerified: boolean("is_verified").default(false).notNull(), // Подтвержден ли через Telegram
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"), // Дата подтверждения через Telegram
});

// Временная таблица для хранения данных регистрации до подтверждения через Telegram
export const pendingClients = pgTable("pending_clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }),
  verificationCode: varchar("verification_code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type PendingClient = typeof pendingClients.$inferSelect;
export type NewPendingClient = typeof pendingClients.$inferInsert;

// Временная таблица для хранения кодов подтверждения из Telegram
export const telegramVerificationCodes = pgTable("telegram_verification_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  telegramId: varchar("telegram_id", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 50 }), // Телефон клиента (опционально, для связи)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Код действителен 10 минут
  isUsed: boolean("is_used").default(false).notNull(),
});

// Таблица для отслеживания отправленных напоминаний
export const reminderSent = pgTable("reminder_sent", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  reminderType: varchar("reminder_type", { length: 20 }).default("1hour").notNull(), // Тип напоминания: 1hour, 24hours и т.д.
});

export type ReminderSent = typeof reminderSent.$inferSelect;
export type NewReminderSent = typeof reminderSent.$inferInsert;

// Запросы на изменение рабочего дня мастера (отправляются мастером из бота, обрабатываются администратором в админке)
export const workSlotChangeRequests = pgTable("work_slot_change_requests", {
  id: serial("id").primaryKey(),
  workSlotId: integer("work_slot_id").notNull().references(() => workSlots.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull().references(() => masters.id, { onDelete: "cascade" }),
  suggestedWorkDate: varchar("suggested_work_date", { length: 10 }).notNull(), // YYYY-MM-DD
  suggestedStartTime: varchar("suggested_start_time", { length: 5 }).notNull(), // HH:MM
  suggestedEndTime: varchar("suggested_end_time", { length: 5 }).notNull(), // HH:MM
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | accepted | rejected
  type: varchar("type", { length: 30 }).notNull().default("time_change"), // time_change | cancel_update
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkSlotChangeRequest = typeof workSlotChangeRequests.$inferSelect;
export type NewWorkSlotChangeRequest = typeof workSlotChangeRequests.$inferInsert;

export type TelegramVerificationCode = typeof telegramVerificationCodes.$inferSelect;
export type NewTelegramVerificationCode = typeof telegramVerificationCodes.$inferInsert;

// Relations для удобной работы с данными
export const mastersRelations = relations(masters, ({ many }) => ({
  workSlots: many(workSlots),
  appointments: many(appointments),
}));

export const workSlotsRelations = relations(workSlots, ({ one }) => ({
  master: one(masters, {
    fields: [workSlots.masterId],
    references: [masters.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  master: one(masters, {
    fields: [appointments.masterId],
    references: [masters.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));




