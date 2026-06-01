const { object, string, pipe, email, minLength } = require("valibot");

const loginSchema = object({
  email: pipe(string(), email("Invalid email address")),
  password: pipe(string(), minLength(1, "Password is required")),
});

module.exports = { loginSchema };
