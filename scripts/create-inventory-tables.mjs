import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  category VARCHAR(100),
  low_stock_threshold NUMERIC(12, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_lots (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  qty_initial NUMERIC(12, 2) NOT NULL,
  qty_remaining NUMERIC(12, 2) NOT NULL,
  price_per_unit INTEGER NOT NULL,
  supplier VARCHAR(200),
  arrived_at VARCHAR(10) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_variant_materials (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS appointment_material_usage (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL,
  appointment_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  total_cost INTEGER NOT NULL,
  lots_consumed JSONB NOT NULL,
  shortfall NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS svm_variant_material_idx
  ON service_variant_materials (variant_id, material_id);
`;

try {
  await client.query(sql);
  console.log("OK: all 4 inventory tables created (or already exist)");
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
