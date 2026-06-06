const { object, string, pipe, email, optional, boolean, minLength } = require("valibot");

const createUserSchema = object({
  email:      pipe(string(), email("Invalid email address")),
  password:   pipe(string(), minLength(6, "Password must be at least 6 characters")),
  userRoleId: pipe(string(), minLength(1, "userRoleId is required")),
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

const updateUserSchema = object({
  roleId:     optional(string()),
  employeeId: optional(string()),
  isActive:   optional(boolean()),
});

const resetPasswordSchema = object({
  password: pipe(string(), minLength(6, "Password must be at least 6 characters")),
});

module.exports = { createUserSchema, updateUserSchema, resetPasswordSchema };
