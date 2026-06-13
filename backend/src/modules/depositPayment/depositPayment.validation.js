const { object, string, optional, pipe, minLength } = require("valibot");

const createDepositPaymentSchema = object({
  paymentMethodId: pipe(string(), minLength(1, "paymentMethodId is required")),
  paidAt:          optional(string()),
  referenceNo:     optional(string()),
  notes:           optional(string()),
});

module.exports = { createDepositPaymentSchema };
