const { object, string, optional, pipe, minLength, number, minValue } = require("valibot");

const createDepositSchema = object({
  paymentMethodId: pipe(string(), minLength(1, "paymentMethodId is required")),
  amount:          pipe(number(), minValue(0.01, "amount must be greater than 0")),
  paidAt:          optional(string()),
  notes:           optional(string()),
});

module.exports = { createDepositSchema };
