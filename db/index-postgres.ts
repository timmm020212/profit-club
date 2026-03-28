// Load .env.local only in local development (Vercel provides env vars natively)
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config({ path: '.env.local' }); } catch {}
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema-postgres';

// Создаем пул соединений PostgreSQL
const dbUrl = process.env.DATABASE_URL || "";
console.log(`[db] DATABASE_URL user: ${dbUrl ? (dbUrl.match(/\/\/([^:@]+)/)?.[1] ?? "parse-error") : "EMPTY"}`);
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
