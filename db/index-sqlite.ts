import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema-sqlite';

// Временное решение: используем моковые данные, если better-sqlite3 не работает
let db: any;
let connectionError: Error | null = null;

try {
  // Создаем SQLite базу данных
  const sqlite = new Database('profit_club.db');
  db = drizzle(sqlite, { schema });
  console.log('SQLite database connected successfully');
} catch (error) {
  connectionError = error as Error;
  console.error('Failed to connect to SQLite, using mock data:', error);
  // Создаем моковый объект db с тестовыми данными
  const mockServices = [
    { id: 1, name: 'Стрижка женская', description: 'Профессиональная стрижка женских волос', price: '2500 ₽', duration: 60, imageUrl: null, category: 'Парикмахерские услуги', executorRole: 'парикмахер', badgeText: 'ХИТ', badgeType: 'accent' },
    { id: 2, name: 'Маникюр классический', description: 'Классический маникюр с покрытием гель-лаком', price: '1500 ₽', duration: 90, imageUrl: null, category: 'Ногтевой сервис', executorRole: 'мастер ногтевого сервиса', badgeText: 'NEW', badgeType: 'discount' },
    { id: 3, name: 'Массаж спины', description: 'Расслабляющий массаж спины', price: '2000 ₽', duration: 45, imageUrl: null, category: 'Массаж', executorRole: 'массажист', badgeText: 'ПОПУЛЯРНОЕ', badgeType: 'dark' }
  ];
  
  db = {
    select: () => ({
      from: () => Promise.resolve(mockServices)
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([])
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([])
        })
      })
    }),
    delete: () => ({
      where: () => ({
        returning: () => Promise.resolve([])
      })
    })
  };
}

export { db, connectionError };

// Функция для проверки подключения
export async function testConnection() {
  try {
    if (connectionError) {
      return false;
    }
    // Для моковых данных всегда возвращаем true
    return true;
  } catch (error) {
    console.error("SQLite connection test failed:", error);
    return false;
  }
}

