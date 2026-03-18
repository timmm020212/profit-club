const Database = require('better-sqlite3');
const db = new Database('profit_club.db');

// Добавляем колонку image_url для совместимости
db.exec(`
ALTER TABLE services ADD COLUMN image_url TEXT;
`);

console.log('Колонка image_url добавлена в таблицу services');
db.close();
