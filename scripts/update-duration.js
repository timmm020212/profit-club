const Database = require('better-sqlite3');
const db = new Database('profit_club.db');

// Функция для правильного склонения времени
function formatDuration(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let hourWord = 'час';
    if (hours >= 2 && hours <= 4) hourWord = 'часа';
    if (hours >= 5) hourWord = 'часов';
    
    if (mins > 0) {
      return `${hours} ${hourWord} ${mins} мин`;
    } else {
      return `${hours} ${hourWord}`;
    }
  } else {
    return `${minutes} мин`;
  }
}

// Обновляем услуги с правильным форматом длительности
const updateDuration = db.prepare(`
UPDATE services 
SET duration = ?
WHERE id = ?
`);

// Обновляем услуги
updateDuration.run(formatDuration(60), 1); // Стрижка женская - 1 час
updateDuration.run(formatDuration(90), 2); // Маникюр классический - 1.5 часа
updateDuration.run(formatDuration(45), 3); // Массаж спины - 45 мин

console.log('Длительности обновлены!');
db.close();
