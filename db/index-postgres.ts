if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config({ path: '.env.local' }); } catch {}
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema-postgres';

// Создаем пул соединений PostgreSQL
// Supabase transaction pooler (port 6543) aggressively kills idle connections.
// We keep pool small and recreate connections frequently.
const dbUrl = process.env.DATABASE_URL || "";
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

// Handle pool errors to prevent crash on idle disconnect
pool.on('error', (err) => {
  console.error('[pg-pool] Unexpected error on idle client:', err.message);
});

export const db = drizzle(pool, { schema });

// Функция для проверки подключения
export async function testConnection() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("PostgreSQL connection test failed:", error);
    return false;
  }
}
