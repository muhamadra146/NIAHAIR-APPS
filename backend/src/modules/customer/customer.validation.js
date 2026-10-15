const { object, string, pipe, email, optional, picklist, minLength, boolean, regex, trim, check } = require("valibot");
const { wibDateStr } = require("../../utils/date");

// CRM-005: Indonesian phone format (08xx or 628xx)
const phoneSchema = pipe(
  string(),
  regex(/^(08\d{8,11}|628\d{7,10})$/, "Format nomor HP tidak valid. Gunakan format 08xx (10-13 digit) atau 628xx (10-13 digit)"),
);

// Tanggal lahir tidak boleh setelah hari ini (WIB) (G1-23)
const birthDateSchema = pipe(
  string(),
  regex(/^\d{4}-\d{2}-\d{2}/,"Format tanggal tidak valid (YYYY-MM-DD)"),
  check((v) => !Number.isNaN(new Date(v).getTime()), "Format tanggal tidak valid (YYYY-MM-DD)"),
  check((v) => String(v).slice(0, 10) <= wibDateStr(), "Tanggal lahir tidak boleh di masa depan"),
);

const createCustomerSchema = object({
  // trim: nama berisi spasi saja ditolak (G1-23)
  name:        pipe(string(), trim(), minLength(1, "Nama wajib diisi")),
  mobilePhone: phoneSchema,
  email:       optional(pipe(string(), email("Format email tidak valid"))),
  address:     optional(string()),
  city:        optional(string()),
  province:    optional(string()),
  birthDate:   optional(birthDateSchema),
  gender:      optional(picklist(["MALE", "FEMALE"], "Gender harus MALE atau FEMALE")),
  notes:       optional(string()),
});

const updateCustomerSchema = object({
  name:        optional(pipe(string(), trim(), minLength(1, "Nama tidak boleh kosong"))),
  mobilePhone: optional(phoneSchema),
  email:       optional(pipe(string(), email("Format email tidak valid"))),
  address:     optional(string()),
  city:        optional(string()),
  province:    optional(string()),
  birthDate:   optional(birthDateSchema),
  gender:      optional(picklist(["MALE", "FEMALE"], "Gender harus MALE atau FEMALE")),
  notes:       optional(string()),
  isActive:    optional(boolean()),
});

module.exports = { createCustomerSchema, updateCustomerSchema };
