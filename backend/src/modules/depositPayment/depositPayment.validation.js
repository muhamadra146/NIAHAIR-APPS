const { object, string, optional, pipe, minLength } = require("valibot");

// Field wajib: kunci yang tidak dikirim diperlakukan sama dengan kosong agar pesan tetap Bahasa Indonesia
const requiredString = (message) => pipe(optional(string(message), ""), minLength(1, message));

const createDepositPaymentSchema = object({
  paymentMethodId: requiredString("Metode pembayaran wajib dipilih"),
  paidAt:          optional(string()),
  referenceNo:     optional(string()),
  notes:           optional(string()),
});

module.exports = { createDepositPaymentSchema };
