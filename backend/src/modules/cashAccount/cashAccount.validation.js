const { object, string, number, boolean, optional, pipe, minLength } = require("valibot");

const createCashAccountSchema = object({
  name:              pipe(string(), minLength(1, "Nama wajib diisi")),
  code:              pipe(string(), minLength(1, "Kode wajib diisi")),
  accurateAccountId: optional(number()),
  accurateAccountNo: optional(string()),
});

const updateCashAccountSchema = object({
  name:              optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  accurateAccountId: optional(number()),
  accurateAccountNo: optional(string()),
  isActive:          optional(boolean()),
});

module.exports = { createCashAccountSchema, updateCashAccountSchema };
