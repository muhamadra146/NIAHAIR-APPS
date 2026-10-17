const { object, string, pipe, optional, boolean, minLength, maxLength, trim } = require("valibot");

// Spasi di tepi dibuang dulu — kode/nama berisi spasi saja ditolak

const createDivisionSchema = object({
  code:     pipe(string(), trim(), minLength(1, "Kode divisi wajib diisi"), maxLength(30, "Kode maksimal 30 karakter")),
  name:     pipe(string(), trim(), minLength(1, "Nama divisi wajib diisi"), maxLength(60, "Nama maksimal 60 karakter")),
  isActive: optional(boolean()),
});

const updateDivisionSchema = object({
  code:     optional(pipe(string(), trim(), minLength(1, "Kode divisi wajib diisi"), maxLength(30, "Kode maksimal 30 karakter"))),
  name:     optional(pipe(string(), trim(), minLength(1, "Nama divisi wajib diisi"), maxLength(60, "Nama maksimal 60 karakter"))),
  isActive: optional(boolean()),
});

module.exports = { createDivisionSchema, updateDivisionSchema };
