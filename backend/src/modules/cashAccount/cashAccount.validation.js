const { object, string, number, boolean, optional, pipe, minLength, integer, minValue, maxValue, trim } = require("valibot");

// ID akun Accurate: bilangan bulat positif dalam batas INT (G5-10)
const accurateAccountId = pipe(
  number("ID akun Accurate harus angka"),
  integer("ID akun Accurate harus bilangan bulat"),
  minValue(1, "ID akun Accurate harus lebih dari 0"),
  maxValue(2147483647, "ID akun Accurate terlalu besar"),
);

const createCashAccountSchema = object({
  name:              pipe(string(), trim(), minLength(1, "Nama wajib diisi")),
  code:              pipe(string(), trim(), minLength(1, "Kode wajib diisi")),
  accurateAccountId: optional(accurateAccountId),
  accurateAccountNo: optional(string()),
});

const updateCashAccountSchema = object({
  name:              optional(pipe(string(), trim(), minLength(1, "Nama tidak boleh kosong"))),
  accurateAccountId: optional(accurateAccountId),
  accurateAccountNo: optional(string()),
  isActive:          optional(boolean()),
});

module.exports = { createCashAccountSchema, updateCashAccountSchema };
