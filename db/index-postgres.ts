// Load .env.local only in local development (Vercel provides env vars natively)
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config({ path: '.env.local' }); } catch {}
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema-postgres';

// Создаем пул соединений PostgreSQL
const dbUrl = process.env.DATABASE_URL || "";
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

// Handle pool errors to prevent crash on idle disconnect
pool.on('error', (err) => {
  console.error('[pg-pool] Unexpected error on idle client:', err.message);
});

export const db = drizzle(pool, { schema });

// Retry helper — Supabase pooler aggressively kills idle connections.
// Up to 5 attempts with exponential backoff: 200, 400, 800, 1600ms (total ~3s max).
export async function dbRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const cause = (err as { cause?: { message?: string } })?.cause?.message || "";
      const combined = `${msg} ${cause}`;
      const isTransient = /terminated|ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|connection|socket hang up|client has encountered/i.test(combined);
      if (!isTransient || i === attempts - 1) throw err;
      const delay = 200 * Math.pow(2, i); // 200, 400, 800, 1600
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

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
