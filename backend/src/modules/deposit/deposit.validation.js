const { object, string, optional, nullable, pipe, minLength, number, minValue, isoDate } = require("valibot");

// Field wajib: kunci yang tidak dikirim diperlakukan sama dengan kosong agar pesan tetap Bahasa Indonesia
const requiredString = (message) => pipe(optional(string(message), ""), minLength(1, message));

const createDepositSchema = object({
  customerId:    requiredString("Pelanggan wajib dipilih"),
  amount:        pipe(optional(number("Jumlah harus berupa angka"), 0), minValue(0.01, "Jumlah harus lebih dari 0")),
  appointmentId: optional(string()),
  notes:         optional(string()),
  // Tanggal setelah hari ini (WIB) ditolak di service
  paidAt:        optional(nullable(pipe(string(), isoDate("Format tanggal tidak valid (YYYY-MM-DD)")))),
});

const updateDepositSchema = object({
  notes:  optional(nullable(string())),
  amount: optional(pipe(number("Jumlah harus berupa angka"), minValue(0.01, "Jumlah harus lebih dari 0"))),
});

const linkAppointmentSchema = object({
  appointmentId: requiredString("Booking wajib dipilih"),
});

module.exports = { createDepositSchema, updateDepositSchema, linkAppointmentSchema };
