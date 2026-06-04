const { object, string, boolean, optional, pipe, minLength } = require("valibot");

const createPaymentMethodSchema = object({
  code: pipe(string(), minLength(1, "code is required")),
  name: pipe(string(), minLength(1, "name is required")),
});

const updatePaymentMethodSchema = object({
  name:     optional(pipe(string(), minLength(1, "name cannot be empty"))),
  isActive: optional(boolean()),
});

module.exports = { createPaymentMethodSchema, updatePaymentMethodSchema };
