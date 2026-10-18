const { object, string, number, pipe, minLength, maxLength, minValue, picklist, optional, array, integer, trim } = require("valibot");

// Kategori item yang dapat diskon membership (kategori induk mencakup sub-kategorinya)
const categoryIds = optional(array(pipe(string(), minLength(1))));

// Nama paket di-trim: spasi saja ditolak (B8)
const nameField = pipe(
  string("Nama paket wajib diisi"),
  trim(),
  minLength(1, "Nama paket wajib diisi"),
  maxLength(100, "Nama paket maksimal 100 karakter"),
);

const createMembershipSchema = object({
  name:         nameField,
  price:        pipe(number("Harga wajib diisi"), minValue(0, "Harga tidak boleh negatif")),
  durationDays: pipe(number("Durasi wajib diisi"), integer("Durasi harus bilangan bulat (hari)"), minValue(1, "Durasi minimal 1 hari")),
  discountType:  picklist(["PERCENTAGE", "FIXED_AMOUNT"], "Tipe diskon tidak valid"),
  discountValue: pipe(number("Nilai diskon wajib diisi"), minValue(0, "Nilai diskon tidak boleh negatif")),
  categoryIds,
});

const updateMembershipSchema = object({
  name:          optional(nameField),
  price:         optional(pipe(number("Harga wajib diisi"), minValue(0, "Harga tidak boleh negatif"))),
  durationDays:  optional(pipe(number("Durasi wajib diisi"), integer("Durasi harus bilangan bulat (hari)"), minValue(1, "Durasi minimal 1 hari"))),
  discountType:  optional(picklist(["PERCENTAGE", "FIXED_AMOUNT"], "Tipe diskon tidak valid")),
  discountValue: optional(pipe(number("Nilai diskon wajib diisi"), minValue(0, "Nilai diskon tidak boleh negatif"))),
  categoryIds,
});

module.exports = { createMembershipSchema, updateMembershipSchema };
