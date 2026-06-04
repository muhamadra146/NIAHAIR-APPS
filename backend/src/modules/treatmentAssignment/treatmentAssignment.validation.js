const { object, string, pipe, number, optional, minLength, minValue } = require("valibot");

const createAssignmentSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  workQty:    pipe(number("workQty must be a number"), minValue(0.01, "workQty must be greater than 0")),
  notes:      optional(string()),
});

const updateAssignmentSchema = object({
  workQty: optional(pipe(number("workQty must be a number"), minValue(0.01, "workQty must be greater than 0"))),
  notes:   optional(string()),
});

module.exports = { createAssignmentSchema, updateAssignmentSchema };
