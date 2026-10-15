'use strict';

// Nomor dokumen harian: <KODE>-YYYYMMDD-NNNN (tanggal WIB).
// Urutan diambil dari nomor TERBESAR berawalan hari ini, bukan jumlah dokumen hari ini —
// jumlah menyusut saat dokumen dihapus sehingga nomor berikutnya bentrok (409 Duplicate entry).

const { wibDateStr } = require("./date");

/** "PAY" → "PAY-20261015-" */
const dailyPrefix = (code, now = new Date()) => `${code}-${wibDateStr(now).replace(/-/g, "")}-`;

/** Nomor berikutnya setelah lastNo (nomor terbesar dengan prefix yang sama), mulai 0001 */
const nextDailyNumber = (prefix, lastNo) => {
  const seq = lastNo ? parseInt(String(lastNo).slice(prefix.length), 10) : 0;
  return `${prefix}${String((Number.isFinite(seq) ? seq : 0) + 1).padStart(4, "0")}`;
};

module.exports = { dailyPrefix, nextDailyNumber };
