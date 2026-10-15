const { object, string, boolean, optional, pipe, minLength } = require("valibot");

const createPaymentMethodSchema = object({
  code:          pipe(string(), minLength(1, "Kode wajib diisi")),
  name:          pipe(string(), minLength(1, "Nama wajib diisi")),
  cashAccountId: optional(string()),
});

const updatePaymentMethodSchema = object({
  name:          optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  code:          optional(pipe(string(), minLength(1, "Kode tidak boleh kosong"))),
  isActive:      optional(boolean()),
  cashAccountId: optional(string()),
});

module.exports = { createPaymentMethodSchema, updatePaymentMethodSchema };
