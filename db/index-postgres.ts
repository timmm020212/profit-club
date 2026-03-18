import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Создаем пул соединений PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres123@localhost:5433/profit_club",
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

// Закрытие соединений при завершении
process.on('beforeExit', async () => {
  await pool.end();
});
