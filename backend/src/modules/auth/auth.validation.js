const { object, string, pipe, minLength, email } = require("valibot");

const loginSchema = object({
  identifier: pipe(string(), minLength(1, "Email atau username wajib diisi")),
  password:   pipe(string(), minLength(1, "Password is required")),
});

const forgotPasswordSchema = object({
  email: pipe(string(), email("Format email tidak valid"), minLength(1, "Email wajib diisi")),
});

const resetPasswordSchema = object({
  token:    pipe(string(), minLength(1, "Token wajib diisi")),
  password: pipe(string(), minLength(8, "Password minimal 8 karakter")),
});

const refreshTokenSchema = object({
  refreshToken: pipe(string(), minLength(1, "Refresh token wajib diisi")),
});

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema };
