const { object, string, pipe, email, optional, boolean, minLength } = require("valibot");

const createUserSchema = object({
  username:   pipe(string(), minLength(3, "Username minimal 3 karakter")),
  email:      pipe(string(), email("Format email tidak valid")),
  password:   pipe(string(), minLength(6, "Password minimal 6 karakter")),
  userRoleId: pipe(string(), minLength(1, "Role wajib dipilih")),
  employeeId: pipe(string(), minLength(1, "Karyawan wajib dipilih")),
});

const updateUserSchema = object({
  username:   optional(pipe(string(), minLength(3, "Username minimal 3 karakter"))),
  // Email login = email karyawan — ikut diperbarui di data karyawan
  email:      optional(pipe(string(), email("Format email tidak valid"))),
  roleId:     optional(pipe(string(), minLength(1, "Role tidak boleh kosong"))),
  employeeId: optional(pipe(string(), minLength(1, "Karyawan tidak boleh kosong"))),
  isActive:   optional(boolean()),
});

const resetPasswordSchema = object({
  password: pipe(string(), minLength(6, "Password minimal 6 karakter")),
});

const changeOwnPasswordSchema = object({
  currentPassword: pipe(string(), minLength(1, "Password lama wajib diisi")),
  newPassword:     pipe(string(), minLength(6, "Password baru minimal 6 karakter")),
});

module.exports = { createUserSchema, updateUserSchema, resetPasswordSchema, changeOwnPasswordSchema };
