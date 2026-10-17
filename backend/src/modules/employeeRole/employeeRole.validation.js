const { object, string, pipe, optional, boolean, minLength, trim } = require("valibot");

const createEmployeeRoleSchema = object({
  code: pipe(string(), trim(), minLength(1, "Kode wajib diisi")),
  name: pipe(string(), trim(), minLength(1, "Nama wajib diisi")),
  isActive: optional(boolean()),
});

const updateEmployeeRoleSchema = object({
  code: optional(pipe(string(), trim(), minLength(1, "Kode tidak boleh kosong"))),
  name: optional(pipe(string(), trim(), minLength(1, "Nama tidak boleh kosong"))),
  isActive: optional(boolean()),
});

module.exports = { createEmployeeRoleSchema, updateEmployeeRoleSchema };
