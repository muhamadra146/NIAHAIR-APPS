const { object, string, pipe, minLength, optional, boolean } = require("valibot");

const createShiftSchema = object({
  code:      pipe(string(), minLength(1, "Code is required")),
  name:      pipe(string(), minLength(1, "Name is required")),
  startTime: optional(string()),
  endTime:   optional(string()),
  color:     optional(string()),
  isWorking: optional(boolean()),
});

const updateShiftSchema = object({
  code:      optional(pipe(string(), minLength(1))),
  name:      optional(pipe(string(), minLength(1))),
  startTime: optional(string()),
  endTime:   optional(string()),
  color:     optional(string()),
  isWorking: optional(boolean()),
  isActive:  optional(boolean()),
});

module.exports = { createShiftSchema, updateShiftSchema };
