// Daftarkan device dummy ke database (tanpa data readings).
// Run sekali saat setup: node seed.js
const db = require('./database');

console.log('[SEED] Device dummy sudah terdaftar via database.js:');
db.prepare(`SELECT device_code, name, location FROM devices`).all()
  .forEach(d => console.log(`  - ${d.device_code} | ${d.name} | ${d.location}`));
console.log('[SEED] Data readings hanya akan masuk dari kiriman ESP32.');
