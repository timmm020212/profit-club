const Database = require('better-sqlite3');
const db = new Database('profit_club.db');

// Создаем таблицу услуг
db.exec(`
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  duration INTEGER,
  imageUrl TEXT,
  orderDesktop INTEGER DEFAULT 0,
  orderMobile INTEGER DEFAULT 0,
  badgeText TEXT,
  badgeType TEXT,
  executorRole TEXT,
  category TEXT
);
`);

// Вставляем тестовые услуги
const insertService = db.prepare(`
INSERT OR REPLACE INTO services (id, name, description, price, duration, executorRole, category)
VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const services = [
  [1, 'Стрижка женская', 'Профессиональная стрижка женских волос', '2500 ₽', 60, 'парикмахер', 'Парикмахерские услуги'],
  [2, 'Маникюр классический', 'Классический маникюр с покрытием гель-лаком', '1500 ₽', 90, 'мастер ногтевого сервиса', 'Ногтевой сервис'],
  [3, 'Массаж спины', 'Расслабляющий массаж спины', '2000 ₽', 45, 'массажист', 'Массаж']
];

services.forEach(service => {
  insertService.run(service);
});

console.log('База данных SQLite создана и заполнена!');
db.close();
