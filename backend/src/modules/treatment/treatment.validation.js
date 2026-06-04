const { object, string, optional, pipe, minLength } = require("valibot");

const createSessionSchema = object({
  customerId:    pipe(string(), minLength(1, "customerId is required")),
  branchId:      pipe(string(), minLength(1, "branchId is required")),
  appointmentId: optional(string()),
  startedAt:     optional(string()),
  notes:         optional(string()),
});

const updateSessionSchema = object({
  completedAt: optional(string()),
  notes:       optional(string()),
});

module.exports = { createSessionSchema, updateSessionSchema };
