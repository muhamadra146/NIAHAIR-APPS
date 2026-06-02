const { object, string, pipe, optional, boolean, minLength } = require("valibot");

const createCommissionCategorySchema = object({
  code:     pipe(string(), minLength(1, "Code is required")),
  name:     pipe(string(), minLength(1, "Name is required")),
  isActive: optional(boolean()),
});

const updateCommissionCategorySchema = object({
  code:     optional(pipe(string(), minLength(1, "Code cannot be empty"))),
  name:     optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  isActive: optional(boolean()),
});

module.exports = { createCommissionCategorySchema, updateCommissionCategorySchema };
