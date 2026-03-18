const Database = require('better-sqlite3');
const db = new Database('profit_club.db');

// Создаем таблицы для админки
db.exec(`
CREATE TABLE IF NOT EXISTS masters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  specialization TEXT NOT NULL,
  telegramId TEXT,
  phone TEXT,
  staffPassword TEXT,
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  masterId INTEGER NOT NULL,
  serviceId INTEGER NOT NULL,
  appointmentDate TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  clientName TEXT NOT NULL,
  clientPhone TEXT,
  clientTelegramId TEXT,
  status TEXT DEFAULT 'confirmed' NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS workSlots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  masterId INTEGER NOT NULL,
  workDate TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')) NOT NULL
);
`);

// Добавляем тестового мастера
const insertMaster = db.prepare(`
INSERT OR REPLACE INTO masters (id, fullName, specialization, isActive)
VALUES (?, ?, ?, ?)
`);

insertMaster.run(1, 'Анна Петрова', 'Парикмахер-стилист', 1);
insertMaster.run(2, 'Мария Иванова', 'Мастер ногтевого сервиса', 1);
insertMaster.run(3, 'Елена Смирнова', 'Массажист', 1);

console.log('Таблицы для админки созданы!');
console.log('Добавлены тестовые мастера');
db.close();
