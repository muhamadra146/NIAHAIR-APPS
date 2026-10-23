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

const { StatusCodes } = require("http-status-codes");
const AppError        = require("../common/errors/AppError");

const WIB_TZ        = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS        = 24 * 60 * 60 * 1000;
const DATE_STR_RE   = /^\d{4}-\d{2}-\d{2}$/;

const invalidDate = () => new AppError("Tanggal tidak valid", StatusCodes.BAD_REQUEST);

// true bila "YYYY-MM-DD" benar-benar ada di kalender (tolak 2026-02-30, 2026-13-01, …)
function isValidDateStr(value) {
  if (typeof value !== "string" || !DATE_STR_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// "YYYY-MM-DD" menurut kalender WIB untuk sebuah waktu (default: sekarang)
function wibDateStr(date = new Date()) {
  return new Date(new Date(date).getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

// Normalisasi input "YYYY-MM-DD" | Date → "YYYY-MM-DD" (Date dibaca dalam WIB).
// Tanggal mustahil (mis. 2026-02-30) atau tidak terbaca → AppError 400 "Tanggal tidak valid"
// (dulu digeser diam-diam oleh Date, 2026-02-30 → 2 Mar).
function toDateStr(value) {
  if (value === undefined) return wibDateStr();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    if (!isValidDateStr(value.slice(0, 10))) throw invalidDate();
    if (value.length === 10) return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw invalidDate();
  return wibDateStr(d);
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

// Tanggal-saja (00:00 UTC) digeser n hari kalender
function addDaysDateOnly(value, n) {
  return new Date(toDateOnly(value).getTime() + n * DAY_MS);
}

// Komponen kalender WIB { year, month (1-12), day, weekday (0=Minggu) }
function wibParts(date = new Date()) {
  const d = new Date(new Date(date).getTime() + WIB_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

module.exports = {
  WIB_TZ, WIB_OFFSET_MS, wibDateStr, toDateStr, wibDayStart, wibDayEnd, toDateOnly, wibParts,
  isValidDateStr, addDaysDateOnly,
};
