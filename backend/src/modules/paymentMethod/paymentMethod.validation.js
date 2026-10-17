const { object, string, boolean, optional, nullable, pipe, minLength, trim } = require("valibot");

// cashAccountId: null = lepas tautan akun kas (G5-13)
const createPaymentMethodSchema = object({
  code:          pipe(string(), trim(), minLength(1, "Kode wajib diisi")),
  name:          pipe(string(), trim(), minLength(1, "Nama wajib diisi")),
  cashAccountId: optional(nullable(string())),
});

const updatePaymentMethodSchema = object({
  name:          optional(pipe(string(), trim(), minLength(1, "Nama tidak boleh kosong"))),
  code:          optional(pipe(string(), trim(), minLength(1, "Kode tidak boleh kosong"))),
  isActive:      optional(boolean()),
  cashAccountId: optional(nullable(string())),
});

module.exports = { createPaymentMethodSchema, updatePaymentMethodSchema };
