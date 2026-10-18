const { object, string, pipe, optional, nullable, picklist, minLength, maxLength, boolean, regex, trim, toLowerCase, check, transform } = require("valibot");
const { wibDateStr } = require("../../utils/date");
const { PHONE_REGEX, PHONE_MESSAGE, cleanPhone, canonicalPhone, isRealDate } = require("./customer.fields");

// Batas panjang teks mengikuti batas Accurate customer/save.do (diuji 2026-10-19:
// billStreet maks 255, billCity/billProvince maks 50) — kolom DB bertipe text (B5)
const MAX = { name: 100, email: 100, address: 255, city: 50, province: 50, notes: 1000 };

// CRM-005: nomor HP Indonesia (08xx atau 628xx). Pemisah (spasi, -, ., kurung) dan "+"
// dibuang sebelum dicek; disimpan dalam format 628xx agar 08xx = 628xx = +628xx.
const phoneSchema = pipe(
  string("Nomor HP wajib diisi"),
  transform(cleanPhone),
  regex(PHONE_REGEX, PHONE_MESSAGE),
  transform(canonicalPhone),
);

// Tanggal lahir: tanggal kalender yang benar-benar ada dan tidak setelah hari ini (WIB) (G1-23, B2)
const birthDateSchema = pipe(
  string(),
  check(isRealDate, "Format tanggal tidak valid (YYYY-MM-DD)"),
  check((v) => String(v).slice(0, 10) <= wibDateStr(), "Tanggal lahir tidak boleh di masa depan"),
);

/** Teks opsional: di-trim, string kosong = dikosongkan (null) */
const optionalText = (max, label) => optional(nullable(pipe(
  string(),
  trim(),
  maxLength(max, `${label} maksimal ${max} karakter`),
  transform((v) => (v === "" ? null : v)),
)));

const emailSchema = optional(nullable(pipe(
  string(),
  trim(),
  toLowerCase(),
  maxLength(MAX.email, `Email maksimal ${MAX.email} karakter`),
  check((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Format email tidak valid"),
  transform((v) => (v === "" ? null : v)),
)));

const birthDateField = optional(nullable(pipe(
  string(),
  transform((v) => v.trim()),
  check((v) => v === "" || isRealDate(v), "Format tanggal tidak valid (YYYY-MM-DD)"),
  check((v) => v === "" || v.slice(0, 10) <= wibDateStr(), "Tanggal lahir tidak boleh di masa depan"),
  transform((v) => (v === "" ? null : v)),
)));

const genderField = optional(nullable(picklist(["MALE", "FEMALE"], "Jenis kelamin harus Laki-laki atau Perempuan")));

const nameField = (requiredMsg) => pipe(
  string(requiredMsg),
  trim(),
  minLength(1, requiredMsg),
  maxLength(MAX.name, `Nama maksimal ${MAX.name} karakter`),
);

const createCustomerSchema = object({
  // trim: nama berisi spasi saja ditolak (G1-23)
  name:        nameField("Nama wajib diisi"),
  mobilePhone: phoneSchema,
  email:       emailSchema,
  address:     optionalText(MAX.address, "Alamat"),
  city:        optionalText(MAX.city, "Kota"),
  province:    optionalText(MAX.province, "Provinsi"),
  birthDate:   birthDateField,
  gender:      genderField,
  notes:       optionalText(MAX.notes, "Catatan"),
});

// null / "" = kosongkan kolom (B4)
const updateCustomerSchema = object({
  name:        optional(nameField("Nama tidak boleh kosong")),
  mobilePhone: optional(phoneSchema),
  email:       emailSchema,
  address:     optionalText(MAX.address, "Alamat"),
  city:        optionalText(MAX.city, "Kota"),
  province:    optionalText(MAX.province, "Provinsi"),
  birthDate:   birthDateField,
  gender:      genderField,
  notes:       optionalText(MAX.notes, "Catatan"),
  isActive:    optional(boolean()),
});

module.exports = { createCustomerSchema, updateCustomerSchema, birthDateSchema, phoneSchema, MAX };
