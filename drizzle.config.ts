import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres.nudnkpazetugfwykcxfw:Slepade2777@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
  },
} satisfies Config;
