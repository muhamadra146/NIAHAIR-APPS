const { object, string, number, optional, pipe, minLength, minValue } = require("valibot");

const createPaymentSchema = object({
  paymentMethodId: pipe(string(), minLength(1, "Metode pembayaran wajib dipilih")),
  amount:          pipe(number(), minValue(0.01, "Jumlah harus lebih dari 0")),
  paymentDate:     optional(string()),
  referenceNo:     optional(string()),
  notes:           optional(string()),
});

module.exports = { createPaymentSchema };
