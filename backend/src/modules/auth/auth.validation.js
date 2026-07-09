const { object, string, pipe, minLength } = require("valibot");

const loginSchema = object({
  identifier: pipe(string(), minLength(1, "Email atau username wajib diisi")),
  password:   pipe(string(), minLength(1, "Password is required")),
});

module.exports = { loginSchema };
