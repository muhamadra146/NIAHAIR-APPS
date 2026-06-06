const { object, string, pipe, optional, boolean, minLength } = require("valibot");

const createUserRoleSchema = object({
  code: pipe(string(), minLength(1, "Code is required")),
  name: pipe(string(), minLength(1, "Name is required")),
});

// Code is a permanent identifier — excluded from update schema
const updateUserRoleSchema = object({
  name:     optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  isActive: optional(boolean()),
});

module.exports = { createUserRoleSchema, updateUserRoleSchema };
