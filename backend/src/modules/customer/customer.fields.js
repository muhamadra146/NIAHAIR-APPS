// ── Nomor HP Indonesia (CRM-005) ──────────────────────────────────────
// Input boleh berformat "+62 812-3456-7890", "0812 3456 7890", "62812…".
// Validasi tetap 08xx (10-13 digit) atau 628xx (10-13 digit); spasi, tanda hubung,
// titik, dan kurung dibuang, awalan "+62" dibaca sebagai "62".
// Disimpan dalam format 628xx — format mayoritas data pelanggan (hasil sinkron Accurate).

const PHONE_REGEX = /^(08\d{8,11}|628\d{7,10})$/;
const PHONE_MESSAGE = "Format nomor HP tidak valid. Gunakan format 08xx (10-13 digit) atau 628xx (10-13 digit)";

/** Buang pemisah & "+" di depan: "+62 812-34" → "6281234" */
const cleanPhone = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/[\s\-.()]/g, "").replace(/^\+/, "");
};

/** Bentuk baku untuk disimpan & dibandingkan: 08xx → 628xx */
const canonicalPhone = (value) => {
  const cleaned = cleanPhone(value);
  if (!cleaned) return cleaned;
  return cleaned.startsWith("0") ? `62${cleaned.slice(1)}` : cleaned;
};

// ── Tanggal kalender ──────────────────────────────────────────────────
// "2026-02-31" ditolak: new Date() menggesernya ke 3 Maret, jadi dicek bolak-balik.

/** true bila 10 karakter pertama adalah tanggal kalender yang benar-benar ada */
const isRealDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return false;
  const ymd = value.slice(0, 10);
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd;
};

/** Escape wildcard LIKE (%, _, \) agar pencarian "%" dibaca harfiah */
const escapeLike = (value) => String(value).replace(/[\\%_]/g, (c) => `\\${c}`);

module.exports = { PHONE_REGEX, PHONE_MESSAGE, cleanPhone, canonicalPhone, isRealDate, escapeLike };
