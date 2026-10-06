// ── Helper tanggal WIB (Asia/Jakarta, UTC+7, tanpa DST) ───────────────
//
// Semua batas "hari" bisnis memakai kalender WIB, bukan UTC.
//
// Aturan pemakaian:
//   · "Hari ini" / tanggal string  → wibDateStr(date)
//   · Filter rentang kolom TIMESTAMP (createdAt, invoiceDate, paymentDate, …)
//     dan kolom tanggal yang disimpan sebagai 00:00 UTC (visitDate, …)
//                                   → gte: wibDayStart(start), lte: wibDayEnd(end)
//   · Nilai / filter kolom @db.Date (workDate StaffSchedule, periodStart/End payroll,
//     holiday.date, returnDate, productionDate)
//                                   → toDateOnly(…)  (00:00 UTC dari tanggal WIB)
//     JANGAN pakai wibDayStart/End untuk @db.Date — Prisma memotong ke tanggal UTC
//     sehingga batasnya bergeser 1 hari.

const WIB_TZ        = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// "YYYY-MM-DD" menurut kalender WIB untuk sebuah waktu (default: sekarang)
function wibDateStr(date = new Date()) {
  return new Date(new Date(date).getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

// Normalisasi input "YYYY-MM-DD" | Date → "YYYY-MM-DD" (Date dibaca dalam WIB)
function toDateStr(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return wibDateStr(value);
}

// 00:00:00.000 WIB pada tanggal tsb (sebagai instant UTC)
function wibDayStart(value) {
  return new Date(`${toDateStr(value)}T00:00:00.000+07:00`);
}

// 23:59:59.999 WIB pada tanggal tsb (sebagai instant UTC)
function wibDayEnd(value) {
  return new Date(`${toDateStr(value)}T23:59:59.999+07:00`);
}

// Nilai tanggal-saja: 00:00 UTC dari tanggal kalender WIB (konvensi Prisma @db.Date)
function toDateOnly(value = new Date()) {
  return new Date(`${toDateStr(value)}T00:00:00.000Z`);
}

// Komponen kalender WIB { year, month (1-12), day, weekday (0=Minggu) }
function wibParts(date = new Date()) {
  const d = new Date(new Date(date).getTime() + WIB_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

module.exports = { WIB_TZ, WIB_OFFSET_MS, wibDateStr, toDateStr, wibDayStart, wibDayEnd, toDateOnly, wibParts };
