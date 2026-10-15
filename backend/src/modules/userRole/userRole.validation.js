const { object, string, pipe, optional, boolean, minLength } = require("valibot");

const createUserRoleSchema = object({
  code: pipe(string(), minLength(1, "Kode wajib diisi")),
  name: pipe(string(), minLength(1, "Nama wajib diisi")),
});

// Code is a permanent identifier — excluded from update schema
const updateUserRoleSchema = object({
  name:     optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  isActive: optional(boolean()),
});

module.exports = { createUserRoleSchema, updateUserRoleSchema };
