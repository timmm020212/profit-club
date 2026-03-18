const Database = require('better-sqlite3');
const db = new Database('profit_club.db');
const services = db.prepare('SELECT id, name, badgeText, badgeType FROM services').all();
console.log('Услуги в базе:');
services.forEach(s => console.log(`ID: ${s.id}, Имя: ${s.name}, Значок: ${s.badgeText} (${s.badgeType})`));
db.close();
