// Generates 24 hours of historical dummy data for the 3 dummy devices.
// Run once: node seed.js
const db = require('./database');

const DEVICES = [
  { code: 'DUMMY-001', luarBase: 30, dalamBase: 37, lembapBase: 65 },
  { code: 'DUMMY-002', luarBase: 29, dalamBase: 36, lembapBase: 63 },
  { code: 'DUMMY-003', luarBase: 31, dalamBase: 39, lembapBase: 67 },
];

const INTERVAL_MIN = 10;
const HOURS = 24;
const POINTS = (HOURS * 60) / INTERVAL_MIN;

const existing = db.prepare(
  `SELECT COUNT(*) as c FROM sensor_readings WHERE device_code LIKE 'DUMMY-%'`
).get();

if (existing.c > 0) {
  console.log(`[SEED] Data sudah ada (${existing.c} baris). Dilewati.`);
  process.exit(0);
}

const insert = db.prepare(
  `INSERT INTO sensor_readings (device_code, suhu_luar, suhu_dalam, kelembapan, recorded_at) VALUES (?, ?, ?, ?, ?)`
);

const seedAll = db.transaction(() => {
  const now = Date.now();
  for (const dev of DEVICES) {
    for (let i = 0; i < POINTS; i++) {
      const ms = now - (POINTS - 1 - i) * INTERVAL_MIN * 60 * 1000;
      const ts = new Date(ms).toISOString();
      // Range sesuai sensor asli: luar 28-33, dalam 35-41, kelembapan 60-71
      const suhuLuar   = +(dev.luarBase  + (Math.random() - 0.5) * 5).toFixed(1);
      const suhuDalam  = +(dev.dalamBase + (Math.random() - 0.5) * 6).toFixed(1);
      const kelembapan = +(dev.lembapBase + (Math.random() - 0.5) * 10).toFixed(1);
      insert.run(dev.code, suhuLuar, suhuDalam, kelembapan, ts);
    }
  }
});

seedAll();
console.log(`[SEED] ${DEVICES.length * POINTS} data dummy berhasil dimasukkan.`);
