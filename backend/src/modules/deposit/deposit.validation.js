const { object, string, optional, pipe, minLength, number, minValue } = require("valibot");

const createDepositSchema = object({
  customerId:    pipe(string(), minLength(1, "customerId is required")),
  amount:        pipe(number(), minValue(0.01, "amount must be greater than 0")),
  appointmentId: optional(string()),
  notes:         optional(string()),
});

const linkAppointmentSchema = object({
  appointmentId: pipe(string(), minLength(1, "appointmentId is required")),
});

module.exports = { createDepositSchema, linkAppointmentSchema };
