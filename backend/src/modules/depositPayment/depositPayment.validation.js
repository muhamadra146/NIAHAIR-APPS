const { object, string, optional, pipe, minLength } = require("valibot");

const createDepositPaymentSchema = object({
  paymentMethodId: pipe(string(), minLength(1, "paymentMethodId is required")),
  referenceNo:     optional(string()),
  notes:           optional(string()),
});

module.exports = { createDepositPaymentSchema };
