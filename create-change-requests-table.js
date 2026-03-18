const Database = require('better-sqlite3');
const db = new Database('profit_club.db');

db.exec(`
CREATE TABLE IF NOT EXISTS workSlotChangeRequests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workSlotId INTEGER NOT NULL,
  masterId INTEGER NOT NULL,
  type TEXT NOT NULL,
  suggestedWorkDate TEXT,
  suggestedStartTime TEXT,
  suggestedEndTime TEXT,
  requestedStartTime TEXT,
  requestedEndTime TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')) NOT NULL
);
`);

console.log('Таблица workSlotChangeRequests создана!');
db.close();
