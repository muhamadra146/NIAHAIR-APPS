const { object, string, pipe, optional, boolean, minLength } = require("valibot");

const createCommissionCategorySchema = object({
  code:     pipe(string(), minLength(1, "Kode wajib diisi")),
  name:     pipe(string(), minLength(1, "Nama wajib diisi")),
  isActive: optional(boolean()),
  allowAnyStaff: optional(boolean()),
});

const updateCommissionCategorySchema = object({
  code:     optional(pipe(string(), minLength(1, "Kode tidak boleh kosong"))),
  name:     optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  isActive: optional(boolean()),
  allowAnyStaff: optional(boolean()),
});

module.exports = { createCommissionCategorySchema, updateCommissionCategorySchema };
