const express = require('express');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /api/sensor-readings ─────────────────────────────────────────────
// Dipanggil oleh ESP32 setiap interval. Auto-register device jika belum ada.
app.post('/api/sensor-readings', (req, res) => {
  const { device_code, water_level, temperature, recorded_at } = req.body;

  if (!device_code || water_level == null) {
    return res.status(400).json({ error: 'device_code dan water_level wajib diisi' });
  }

  db.prepare(
    `INSERT OR IGNORE INTO devices (device_code, name, location, is_dummy) VALUES (?, ?, ?, 0)`
  ).run(device_code, device_code, '');

  const ts = recorded_at || new Date().toISOString();
  db.prepare(
    `INSERT INTO sensor_readings (device_code, water_level, temperature, recorded_at) VALUES (?, ?, ?, ?)`
  ).run(device_code, Number(water_level), temperature != null ? Number(temperature) : null, ts);

  console.log(`[INGEST] ${ts} | ${device_code} | wl=${water_level} cm | temp=${temperature} °C`);
  res.status(201).json({ ok: true });
});

// ── GET /api/devices ──────────────────────────────────────────────────────
app.get('/api/devices', (req, res) => {
  const rows = db.prepare(`
    SELECT
      d.device_code, d.name, d.location, d.is_dummy,
      r.water_level AS last_wl,
      r.temperature AS last_temp,
      r.recorded_at AS last_seen
    FROM devices d
    LEFT JOIN sensor_readings r
      ON r.id = (
        SELECT id FROM sensor_readings
        WHERE device_code = d.device_code
        ORDER BY recorded_at DESC LIMIT 1
      )
    ORDER BY d.is_dummy DESC, d.created_at ASC
  `).all();
  res.json(rows);
});

// ── GET /api/sensor-readings?device_code=X&limit=144 ─────────────────────
app.get('/api/sensor-readings', (req, res) => {
  const { device_code, limit = 144 } = req.query;
  if (!device_code) return res.status(400).json({ error: 'device_code wajib diisi' });

  const rows = db.prepare(`
    SELECT id, device_code, water_level, temperature, recorded_at
    FROM sensor_readings
    WHERE device_code = ?
    ORDER BY recorded_at DESC
    LIMIT ?
  `).all(device_code, Number(limit));

  res.json(rows.reverse());
});

// ── Simulasi data dummy setiap 60 detik ──────────────────────────────────
const DUMMY_CONFIG = {
  'DUMMY-001': { wlBase: 25.0, tempBase: 29.0 },
  'DUMMY-002': { wlBase: 35.0, tempBase: 31.5 },
  'DUMMY-003': { wlBase: 15.0, tempBase: 28.0 },
};

const insertReading = db.prepare(
  `INSERT INTO sensor_readings (device_code, water_level, temperature, recorded_at) VALUES (?, ?, ?, ?)`
);

function simulateDummy() {
  const ts = new Date().toISOString();
  for (const [code, cfg] of Object.entries(DUMMY_CONFIG)) {
    const wl   = +(cfg.wlBase + (Math.random() - 0.5) * 8).toFixed(2);
    const temp = +(cfg.tempBase + (Math.random() - 0.5) * 3).toFixed(1);
    insertReading.run(code, wl, temp, ts);
  }
  console.log('[SIM] Dummy readings generated:', ts);
}

simulateDummy(); // langsung saat startup
setInterval(simulateDummy, 60_000);

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[KOPI] Dashboard: http://localhost:${PORT}`);
  console.log(`[KOPI] API POST : http://localhost:${PORT}/api/sensor-readings`);
});
