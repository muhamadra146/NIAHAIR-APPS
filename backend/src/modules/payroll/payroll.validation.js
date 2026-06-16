const { object, string, pipe, minLength, optional, regex } = require("valibot");

const generateSchema = object({
  employeeId:  pipe(string(), minLength(1, "Employee ID is required")),
  branchId:    pipe(string(), minLength(1, "Branch ID is required")),
  yearMonth:   optional(pipe(string(), regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"))),
  periodStart: optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"))),
  periodEnd:   optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"))),
  notes:       optional(string()),
});

const updateNotesSchema = object({
  notes: optional(string()),
});

module.exports = { generateSchema, updateNotesSchema };
