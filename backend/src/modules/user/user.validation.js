const { object, string, pipe, email, optional, boolean, minLength, trim, toLowerCase } = require("valibot");

// Email login disimpan huruf kecil tanpa spasi (login & reset password tidak peka huruf besar/kecil)
const EMAIL = pipe(string(), trim(), toLowerCase(), email("Format email tidak valid"));

const createUserSchema = object({
  username:   pipe(string(), minLength(3, "Username minimal 3 karakter")),
  email:      EMAIL,
  password:   pipe(string(), minLength(6, "Password minimal 6 karakter")),
  userRoleId: pipe(string(), minLength(1, "Role wajib dipilih")),
  employeeId: pipe(string(), minLength(1, "Karyawan wajib dipilih")),
});

const updateUserSchema = object({
  username:   optional(pipe(string(), minLength(3, "Username minimal 3 karakter"))),
  // Email login = email karyawan — ikut diperbarui di data karyawan
  email:      optional(EMAIL),
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
