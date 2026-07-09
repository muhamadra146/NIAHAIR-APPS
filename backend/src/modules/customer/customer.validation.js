const { object, string, pipe, email, optional, picklist, minLength, boolean, regex } = require("valibot");

// CRM-005: Indonesian phone format (08xx or 628xx)
const phoneSchema = pipe(
  string(),
  regex(/^(08\d{8,11}|628\d{7,10})$/, "Format nomor HP tidak valid. Gunakan format 08xx (10-13 digit) atau 628xx (10-13 digit)"),
);

const createCustomerSchema = object({
  name:        pipe(string(), minLength(1, "Nama wajib diisi")),
  mobilePhone: phoneSchema,
  email:       optional(pipe(string(), email("Format email tidak valid"))),
  address:     optional(string()),
  city:        optional(string()),
  province:    optional(string()),
  birthDate:   optional(string()),
  gender:      optional(picklist(["MALE", "FEMALE"], "Gender harus MALE atau FEMALE")),
  notes:       optional(string()),
});

const updateCustomerSchema = object({
  name:        optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  mobilePhone: optional(phoneSchema),
  email:       optional(pipe(string(), email("Format email tidak valid"))),
  address:     optional(string()),
  city:        optional(string()),
  province:    optional(string()),
  birthDate:   optional(string()),
  gender:      optional(picklist(["MALE", "FEMALE"], "Gender harus MALE atau FEMALE")),
  notes:       optional(string()),
  isActive:    optional(boolean()),
});

module.exports = { createCustomerSchema, updateCustomerSchema };
