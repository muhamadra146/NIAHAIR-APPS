const { object, string, number, pipe, minLength, minValue, picklist, optional, array } = require("valibot");

// Kategori item yang dapat diskon membership (kategori induk mencakup sub-kategorinya)
const categoryIds = optional(array(pipe(string(), minLength(1))));

const createMembershipSchema = object({
  name:         pipe(string(), minLength(1, "Nama wajib diisi")),
  price:        pipe(number(), minValue(0, "Harga tidak boleh negatif")),
  durationDays: pipe(number(), minValue(1, "Durasi minimal 1 hari")),
  discountType:  picklist(["PERCENTAGE", "FIXED_AMOUNT"], "Tipe diskon tidak valid"),
  discountValue: pipe(number(), minValue(0, "Nilai diskon tidak boleh negatif")),
  categoryIds,
});

const updateMembershipSchema = object({
  name:          optional(pipe(string(), minLength(1, "Nama wajib diisi"))),
  price:         optional(pipe(number(), minValue(0, "Harga tidak boleh negatif"))),
  durationDays:  optional(pipe(number(), minValue(1, "Durasi minimal 1 hari"))),
  discountType:  optional(picklist(["PERCENTAGE", "FIXED_AMOUNT"], "Tipe diskon tidak valid")),
  discountValue: optional(pipe(number(), minValue(0, "Nilai diskon tidak boleh negatif"))),
  categoryIds,
});

module.exports = { createMembershipSchema, updateMembershipSchema };
