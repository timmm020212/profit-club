import { config } from "dotenv";
config({ path: ".env.local" });

import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema-postgres.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  tablesFilter: [
    "serviceCategories",
    "serviceSubgroups",
    "services",
    "serviceVariants",
    "admins",
    "masters",
    "appointments",
    "workSlots",
    "workSlotChangeRequests",
    "clients",
    "pendingClients",
    "telegramVerificationCodes",
    "reminderSent",
    "scheduleOptimizations",
    "optimizationMoves",
    "adminSettings",
    "bot_notification_templates",
    "bot_flows",
    "bot_steps",
    "bot_buttons",
    "bot_user_states",
    "masterPortfolio",
    "masterClientNotes",
    "scheduleBlocks",
    "salons",
    "partner_users",
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
