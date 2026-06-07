const { object, string, number, boolean, optional, pipe, minLength } = require("valibot");

const createCashAccountSchema = object({
  name:              pipe(string(), minLength(1, "name is required")),
  code:              pipe(string(), minLength(1, "code is required")),
  accurateAccountId: optional(number()),
  accurateAccountNo: optional(string()),
});

const updateCashAccountSchema = object({
  name:              optional(pipe(string(), minLength(1, "name cannot be empty"))),
  accurateAccountId: optional(number()),
  accurateAccountNo: optional(string()),
  isActive:          optional(boolean()),
});

module.exports = { createCashAccountSchema, updateCashAccountSchema };
