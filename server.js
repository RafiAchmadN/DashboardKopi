const express = require('express');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /api/sensor-readings ─────────────────────────────────────────────
// Dipanggil oleh ESP32. Auto-register device jika belum ada.
app.post('/api/sensor-readings', (req, res) => {
  const { device_code, suhuLuar, suhuDalam, kelembapan, recorded_at } = req.body;

  if (!device_code || suhuLuar == null || suhuDalam == null || kelembapan == null) {
    return res.status(400).json({ error: 'device_code, suhuLuar, suhuDalam, kelembapan wajib diisi' });
  }

  db.prepare(
    `INSERT OR IGNORE INTO devices (device_code, name, location, is_dummy) VALUES (?, ?, ?, 0)`
  ).run(device_code, device_code, '');

  const ts = recorded_at || new Date().toISOString();
  db.prepare(
    `INSERT INTO sensor_readings (device_code, suhu_luar, suhu_dalam, kelembapan, recorded_at) VALUES (?, ?, ?, ?, ?)`
  ).run(device_code, Number(suhuLuar), Number(suhuDalam), Number(kelembapan), ts);

  console.log(`[INGEST] ${ts} | ${device_code} | luar=${suhuLuar}°C dalam=${suhuDalam}°C lembap=${kelembapan}%`);
  res.status(201).json({ ok: true });
});

// ── GET /api/devices ──────────────────────────────────────────────────────
app.get('/api/devices', (req, res) => {
  const rows = db.prepare(`
    SELECT
      d.device_code, d.name, d.location, d.is_dummy,
      r.suhu_luar   AS last_suhu_luar,
      r.suhu_dalam  AS last_suhu_dalam,
      r.kelembapan  AS last_kelembapan,
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

// ── GET /api/sensor-readings?device_code=X&limit=50 ──────────────────────
app.get('/api/sensor-readings', (req, res) => {
  const { device_code, limit = 50 } = req.query;
  if (!device_code) return res.status(400).json({ error: 'device_code wajib diisi' });

  const rows = db.prepare(`
    SELECT id, device_code, suhu_luar, suhu_dalam, kelembapan, recorded_at
    FROM sensor_readings
    WHERE device_code = ?
    ORDER BY recorded_at DESC
    LIMIT ?
  `).all(device_code, Number(limit));

  res.json(rows.reverse());
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[KOPI] Dashboard: http://localhost:${PORT}`);
  console.log(`[KOPI] API POST : http://localhost:${PORT}/api/sensor-readings`);
});
