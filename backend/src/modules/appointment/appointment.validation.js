const { object, string, optional, pipe, minLength, picklist, number, minValue } = require("valibot");

const APPOINTMENT_STATUSES = [
  "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
];

const createAppointmentSchema = object({
  customerId:     pipe(string(), minLength(1, "customerId is required")),
  branchId:       pipe(string(), minLength(1, "branchId is required")),
  visitDate:      pipe(string(), minLength(1, "visitDate is required")),
  startTime:      pipe(string(), minLength(1, "startTime is required")),
  endTime:        pipe(string(), minLength(1, "endTime is required")),
  notes:          optional(string()),
  estimatedTotal: optional(pipe(number(), minValue(0, "estimatedTotal must be >= 0"))),
});

const updateAppointmentSchema = object({
  visitDate:      optional(string()),
  startTime:      optional(string()),
  endTime:        optional(string()),
  notes:          optional(string()),
  estimatedTotal: optional(pipe(number(), minValue(0, "estimatedTotal must be >= 0"))),
});

const changeStatusSchema = object({
  status: picklist(APPOINTMENT_STATUSES, "Invalid appointment status"),
  notes:  optional(string()),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, changeStatusSchema };
