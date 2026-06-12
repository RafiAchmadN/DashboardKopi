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
    is_dummy    INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sensor_readings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    suhu_luar   REAL,
    suhu_dalam  REAL,
    kelembapan  REAL,
    recorded_at DATETIME NOT NULL,
    FOREIGN KEY (device_code) REFERENCES devices(device_code)
  );

  CREATE INDEX IF NOT EXISTS idx_readings_device_time
    ON sensor_readings(device_code, recorded_at DESC);
`);

// Seed 3 dummy devices (idempotent)
const seedDevice = db.prepare(
  `INSERT OR IGNORE INTO devices (device_code, name, location, is_dummy) VALUES (?, ?, ?, 1)`
);
seedDevice.run('DUMMY-001', 'Sensor Dummy 1', 'Ruangan A');
seedDevice.run('DUMMY-002', 'Sensor Dummy 2', 'Ruangan B');
seedDevice.run('DUMMY-003', 'Sensor Dummy 3', 'Ruangan C');

module.exports = db;
