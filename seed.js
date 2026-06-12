// Generates 24 hours of historical dummy data for the 3 dummy devices.
// Run once: node seed.js
const db = require('./database');

const DEVICES = [
  { code: 'DUMMY-001', wlBase: 25.0, tempBase: 29.0 },
  { code: 'DUMMY-002', wlBase: 35.0, tempBase: 31.5 },
  { code: 'DUMMY-003', wlBase: 15.0, tempBase: 28.0 },
];

const INTERVAL_MIN = 10;   // 1 reading per 10 minutes
const HOURS = 24;
const POINTS = (HOURS * 60) / INTERVAL_MIN;

// Only seed if no historical data exists yet
const existing = db.prepare(
  `SELECT COUNT(*) as c FROM sensor_readings WHERE device_code LIKE 'DUMMY-%'`
).get();

if (existing.c > 0) {
  console.log(`[SEED] Data already exists (${existing.c} rows). Skipping.`);
  process.exit(0);
}

const insert = db.prepare(
  `INSERT INTO sensor_readings (device_code, water_level, temperature, recorded_at) VALUES (?, ?, ?, ?)`
);

const seedAll = db.transaction(() => {
  const now = Date.now();
  for (const dev of DEVICES) {
    for (let i = 0; i < POINTS; i++) {
      const ms = now - (POINTS - 1 - i) * INTERVAL_MIN * 60 * 1000;
      const ts = new Date(ms).toISOString();
      const wl   = +(dev.wlBase + (Math.random() - 0.5) * 8).toFixed(2);
      const temp = +(dev.tempBase + (Math.random() - 0.5) * 3).toFixed(1);
      insert.run(dev.code, wl, temp, ts);
    }
  }
});

seedAll();
console.log(`[SEED] Inserted ${DEVICES.length * POINTS} dummy readings.`);
