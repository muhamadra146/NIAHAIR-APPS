const { object, string, optional, nullable, pipe, minLength, number, minValue, isoDate } = require("valibot");

const createDepositSchema = object({
  customerId:    pipe(string(), minLength(1, "Pelanggan wajib dipilih")),
  amount:        pipe(number(), minValue(0.01, "Jumlah harus lebih dari 0")),
  appointmentId: optional(string()),
  notes:         optional(string()),
  paidAt:        optional(nullable(pipe(string(), isoDate("Format tanggal tidak valid (YYYY-MM-DD)")))),
});

const updateDepositSchema = object({
  notes:  optional(nullable(string())),
  amount: optional(pipe(number(), minValue(0.01, "Jumlah harus lebih dari 0"))),
});

const linkAppointmentSchema = object({
  appointmentId: pipe(string(), minLength(1, "Booking wajib dipilih")),
});

module.exports = { createDepositSchema, updateDepositSchema, linkAppointmentSchema };
