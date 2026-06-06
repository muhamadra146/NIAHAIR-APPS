const { object, string, pipe, optional, boolean, minLength } = require("valibot");

const createBranchSchema = object({
  code:     pipe(string(), minLength(1, "Code is required")),
  name:     pipe(string(), minLength(1, "Name is required")),
  address:  optional(string()),
  city:     optional(string()),
  province: optional(string()),
  phone:    optional(string()),
});

const updateBranchSchema = object({
  code:     optional(pipe(string(), minLength(1, "Code cannot be empty"))),
  name:     optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  address:  optional(string()),
  city:     optional(string()),
  province: optional(string()),
  phone:    optional(string()),
  isActive: optional(boolean()),
});

module.exports = { createBranchSchema, updateBranchSchema };
