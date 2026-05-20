// ONE-TIME BOOTSTRAP SCRIPT.
// Canonical schema lives in db/schema-postgres.ts — DO NOT use this script
// as a source of truth. It exists because `drizzle-kit push` fails on a
// pre-existing Supabase permission issue on legacy tables.

import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
CREATE TABLE IF NOT EXISTS salon_admins (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL,
  username VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  rank VARCHAR(20) NOT NULL DEFAULT 'secondary',
  password_hash VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  force_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
  sessions_invalidated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  telegram_id VARCHAR(50),
  can_edit_schedule BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_bookings BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_masters BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_bot_flows BOOLEAN NOT NULL DEFAULT FALSE,
  can_run_optimization BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS salon_admins_salon_username_idx
  ON salon_admins (salon_id, username);
`;

try {
  await client.query(sql);
  console.log("OK: salon_admins table created (or already exists)");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
