import { pgTable, text, varchar, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  telegramId: varchar("telegramId", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: text("createdAt").notNull(),
});

export const masters = pgTable("masters", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  telegramId: varchar("telegram_id", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  staffPassword: varchar("staff_password", { length: 255 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  showOnSite: boolean("show_on_site").default(true).notNull(),
  notificationSettings: text("notification_settings"),
  commissionPercent: integer("commission_percent").default(50).notNull(),
  createdAt: text("created_at").notNull(),
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

export const botNotificationTemplates = pgTable("bot_notification_templates", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  botType: varchar("bot_type", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  messageTemplate: text("message_template").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  variables: text("variables").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botFlows = pgTable("bot_flows", {
  id: serial("id").primaryKey(),
  botType: varchar("bot_type", { length: 20 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerCommand: varchar("trigger_command", { length: 100 }),
  triggerCallback: varchar("trigger_callback", { length: 100 }),
  triggerText: varchar("trigger_text", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bot_flows_bot_type_slug_idx").on(table.botType, table.slug),
]);

export const botSteps = pgTable("bot_steps", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").notNull().references(() => botFlows.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  messageTemplate: text("message_template"),
  parseMode: varchar("parse_mode", { length: 20 }),
  order: integer("order").default(0).notNull(),
  actionType: varchar("action_type", { length: 50 }),
  dataSource: varchar("data_source", { length: 100 }),
  dataFilter: text("data_filter"),
  backStepId: integer("back_step_id"),
  nextStepId: integer("next_step_id"),
  conditionFn: varchar("condition_fn", { length: 50 }),
  conditionParams: text("condition_params"),
  onConditionFailStepId: integer("on_condition_fail_step_id"),
  useReplyKeyboard: boolean("use_reply_keyboard").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bot_steps_flow_id_slug_idx").on(table.flowId, table.slug),
]);

export const botButtons = pgTable("bot_buttons", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id").notNull().references(() => botSteps.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  targetStepId: integer("target_step_id"),
  targetFlowSlug: varchar("target_flow_slug", { length: 100 }),
  callbackData: varchar("callback_data", { length: 100 }),
  urlTemplate: varchar("url_template", { length: 500 }),
  order: integer("order").default(0).notNull(),
  row: integer("row").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botUserStates = pgTable("bot_user_states", {
  id: serial("id").primaryKey(),
  telegramId: varchar("telegram_id", { length: 50 }).notNull().unique(),
  botType: varchar("bot_type", { length: 20 }).notNull(),
  flowId: integer("flow_id"),
  stepId: integer("step_id"),
  vars: text("vars"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const masterPortfolio = pgTable("masterPortfolio", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  description: varchar("description", { length: 200 }),
  serviceId: integer("serviceId"),
  createdAt: text("createdAt").notNull(),
});

export const masterClientNotes = pgTable("masterClientNotes", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  clientIdentifier: varchar("clientIdentifier", { length: 20 }).notNull(),
  note: text("note"),
  updatedAt: text("updatedAt").notNull(),
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
export type BotFlow = typeof botFlows.$inferSelect;
export type NewBotFlow = typeof botFlows.$inferInsert;
export type BotStep = typeof botSteps.$inferSelect;
export type NewBotStep = typeof botSteps.$inferInsert;
export type BotButton = typeof botButtons.$inferSelect;
export type NewBotButton = typeof botButtons.$inferInsert;
export type BotUserState = typeof botUserStates.$inferSelect;
