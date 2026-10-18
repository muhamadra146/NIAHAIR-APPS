const { object, string, pipe, optional, boolean, minLength, trim, transform, regex } = require("valibot");

// Kode dinormalisasi (trim, huruf besar, spasi → "_") lalu hanya boleh A-Z, 0-9, _
const CODE_MSG = "Kode hanya boleh huruf, angka, dan garis bawah (_)";
const codeField = (requiredMsg) => pipe(
  string("Kode wajib diisi"),
  trim(),
  minLength(1, requiredMsg),
  transform((v) => v.toUpperCase().replace(/\s+/g, "_")),
  regex(/^[A-Z0-9_]+$/, CODE_MSG),
);

const createCommissionCategorySchema = object({
  code:     codeField("Kode wajib diisi"),
  name:     pipe(string("Nama wajib diisi"), trim(), minLength(1, "Nama wajib diisi")),
  isActive: optional(boolean("Status aktif harus ya/tidak")),
  allowAnyStaff: optional(boolean("Pengaturan staf bebas harus ya/tidak")),
});

const updateCommissionCategorySchema = object({
  code:     optional(codeField("Kode tidak boleh kosong")),
  name:     optional(pipe(string("Nama harus berupa teks"), trim(), minLength(1, "Nama tidak boleh kosong"))),
  isActive: optional(boolean("Status aktif harus ya/tidak")),
  allowAnyStaff: optional(boolean("Pengaturan staf bebas harus ya/tidak")),
});

module.exports = { createCommissionCategorySchema, updateCommissionCategorySchema };
