const { object, string, pipe, email, optional, boolean, minLength } = require("valibot");

const createUserSchema = object({
  username:   pipe(string(), minLength(3, "Username minimal 3 karakter")),
  email:      pipe(string(), email("Invalid email address")),
  password:   pipe(string(), minLength(6, "Password must be at least 6 characters")),
  userRoleId: pipe(string(), minLength(1, "userRoleId is required")),
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

const updateUserSchema = object({
  username:   optional(pipe(string(), minLength(3, "Username minimal 3 karakter"))),
  roleId:     optional(pipe(string(), minLength(1, "roleId cannot be empty"))),
  employeeId: optional(pipe(string(), minLength(1, "employeeId cannot be empty"))),
  isActive:   optional(boolean()),
});

const resetPasswordSchema = object({
  password: pipe(string(), minLength(6, "Password must be at least 6 characters")),
});

const changeOwnPasswordSchema = object({
  currentPassword: pipe(string(), minLength(1, "Current password is required")),
  newPassword:     pipe(string(), minLength(6, "New password must be at least 6 characters")),
});

module.exports = { createUserSchema, updateUserSchema, resetPasswordSchema, changeOwnPasswordSchema };
