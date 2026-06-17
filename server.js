const express = require('express');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /api/sensor-readings ─────────────────────────────────────────────
// Dipanggil ESP32 setiap 30 detik
app.post('/api/sensor-readings', (req, res) => {
  const { device_code, suhu1, suhu2, kelembapan1, kelembapan2, recorded_at } = req.body;

  if (!device_code || suhu1 == null || suhu2 == null || kelembapan1 == null || kelembapan2 == null) {
    return res.status(400).json({ error: 'device_code, suhu1, suhu2, kelembapan1, kelembapan2 wajib diisi' });
  }

  db.prepare(
    `INSERT OR IGNORE INTO devices (device_code, name, location) VALUES (?, ?, ?)`
  ).run(device_code, device_code, '');

  const ts = recorded_at || new Date().toISOString();
  db.prepare(
    `INSERT INTO sensor_readings (device_code, suhu1, suhu2, kelembapan1, kelembapan2, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(device_code, Number(suhu1), Number(suhu2), Number(kelembapan1), Number(kelembapan2), ts);

  console.log(`[INGEST] ${ts} | ${device_code} | suhu1=${suhu1} suhu2=${suhu2} k1=${kelembapan1} k2=${kelembapan2}`);
  res.status(201).json({ ok: true });
});

// ── GET /api/devices ──────────────────────────────────────────────────────
app.get('/api/devices', (req, res) => {
  const rows = db.prepare(`
    SELECT
      d.device_code, d.name, d.location,
      r.suhu1, r.suhu2, r.kelembapan1, r.kelembapan2,
      r.recorded_at AS last_seen
    FROM devices d
    LEFT JOIN sensor_readings r
      ON r.id = (
        SELECT id FROM sensor_readings
        WHERE device_code = d.device_code
        ORDER BY recorded_at DESC LIMIT 1
      )
    ORDER BY d.created_at ASC
  `).all();
  res.json(rows);
});

// ── GET /api/sensor-readings?device_code=X&limit=50 ──────────────────────
app.get('/api/sensor-readings', (req, res) => {
  const { device_code, limit = 50 } = req.query;
  if (!device_code) return res.status(400).json({ error: 'device_code wajib diisi' });

  const rows = db.prepare(`
    SELECT id, device_code, suhu1, suhu2, kelembapan1, kelembapan2, recorded_at
    FROM sensor_readings
    WHERE device_code = ?
    ORDER BY recorded_at DESC
    LIMIT ?
  `).all(device_code, Number(limit));

  res.json(rows.reverse());
});

// ── GET /api/export-csv?device_code=X&from=2024-01-01&to=2024-12-31 ──────
app.get('/api/export-csv', (req, res) => {
  const { device_code, from, to } = req.query;
  if (!device_code) return res.status(400).json({ error: 'device_code wajib diisi' });

  let query = `SELECT id, device_code, suhu1, suhu2, kelembapan1, kelembapan2, recorded_at
               FROM sensor_readings WHERE device_code = ?`;
  const params = [device_code];

  if (from) { query += ` AND recorded_at >= ?`; params.push(from); }
  if (to)   { query += ` AND recorded_at <= ?`; params.push(to + 'T23:59:59'); }
  query += ` ORDER BY recorded_at ASC`;

  const rows = db.prepare(query).all(...params);

  const header = 'id,device_code,suhu1,suhu2,kelembapan1,kelembapan2,recorded_at\n';
  const csv = header + rows.map(r =>
    `${r.id},${r.device_code},${r.suhu1},${r.suhu2},${r.kelembapan1},${r.kelembapan2},${r.recorded_at}`
  ).join('\n');

  const filename = `kopi_${device_code}_${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[KOPI] Dashboard: http://localhost:${PORT}`);
  console.log(`[KOPI] API POST : http://localhost:${PORT}/api/sensor-readings`);
});
