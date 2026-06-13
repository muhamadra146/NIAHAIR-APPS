const { object, string, pipe, minLength, optional, regex } = require("valibot");

const generateSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  branchId:   pipe(string(), minLength(1, "Branch ID is required")),
  yearMonth:  pipe(string(), regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM")),
  notes:      optional(string()),
});

const updateNotesSchema = object({
  notes: optional(string()),
});

module.exports = { generateSchema, updateNotesSchema };
