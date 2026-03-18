const Database = require('better-sqlite3');
const db = new Database('profit_club.db');

// Обновляем услуги с добавлением значков
const updateBadges = db.prepare(`
UPDATE services 
SET badgeText = ?, badgeType = ?
WHERE id = ?
`);

// Добавляем значки для услуг
updateBadges.run('ХИТ', 'accent', 1);
updateBadges.run('NEW', 'discount', 2);
updateBadges.run('ПОПУЛЯРНОЕ', 'dark', 3);

console.log('Значки добавлены в базу данных!');
db.close();
