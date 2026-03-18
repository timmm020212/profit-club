const Database = require('better-sqlite3');
const sqlite = new Database('profit_club.db');

// Создаем таблицу если не существует
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price TEXT,
    duration INTEGER,
    executorRole TEXT,
    category TEXT,
    imageUrl TEXT,
    orderDesktop INTEGER,
    orderMobile INTEGER,
    badgeText TEXT,
    badgeType TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Вставляем услуги
const insertService = sqlite.prepare(`
  INSERT OR IGNORE INTO services (name, description, price, duration, executorRole, category)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const services = [
  [
    "Стрижка женская",
    "Профессиональная стрижка женских волос с учетом ваших пожеланий и типа лица",
    "2500 ₽",
    60,
    "парикмахер",
    "Парикмахерские услуги"
  ],
  [
    "Маникюр классический",
    "Классический маникюр с покрытием гель-лаком",
    "1500 ₽",
    90,
    "мастер ногтевого сервиса",
    "Ногтевой сервис"
  ],
  [
    "Массаж спины",
    "Расслабляющий массаж спины для снятия напряжения и улучшения кровообращения",
    "2000 ₽",
    45,
    "массажист",
    "Массаж"
  ]
];

services.forEach(service => {
  insertService.run(service);
});

console.log("Database seeded successfully!");
sqlite.close();
