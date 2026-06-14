const { object, string, pipe, number, optional, minLength, minValue, picklist } = require("valibot");

const SLOT_KEYS = ["stylist", "asisten", "colorist"];

const createAssignmentSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  slotKey:    optional(picklist(SLOT_KEYS, "Invalid slotKey")),
  workQty:    pipe(number("workQty must be a number"), minValue(0.01, "workQty must be greater than 0")),
  notes:      optional(string()),
});

const updateAssignmentSchema = object({
  slotKey: optional(picklist(SLOT_KEYS, "Invalid slotKey")),
  workQty: optional(pipe(number("workQty must be a number"), minValue(0.01, "workQty must be greater than 0"))),
  notes:   optional(string()),
});

module.exports = { createAssignmentSchema, updateAssignmentSchema };
