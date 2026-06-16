const { object, string, pipe, minLength, optional } = require("valibot");

const createLeaveSchema = object({
  startDate:   pipe(string(), minLength(1, "Start date required")),
  endDate:     pipe(string(), minLength(1, "End date required")),
  reason:      optional(string()),
  leaveTypeId: optional(string()),
});

const rejectSchema = object({
  notes: optional(string()),
});

module.exports = { createLeaveSchema, rejectSchema };
