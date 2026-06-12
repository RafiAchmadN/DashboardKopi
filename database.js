const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'kopi.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    location    TEXT DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sensor_readings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    suhu1       REAL,
    suhu2       REAL,
    kelembapan1 REAL,
    kelembapan2 REAL,
    recorded_at DATETIME NOT NULL,
    FOREIGN KEY (device_code) REFERENCES devices(device_code)
  );

  CREATE INDEX IF NOT EXISTS idx_readings_device_time
    ON sensor_readings(device_code, recorded_at DESC);
`);

module.exports = db;
