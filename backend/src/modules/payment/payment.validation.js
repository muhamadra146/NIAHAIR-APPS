const { object, string, number, optional, pipe, minLength, minValue } = require("valibot");

const createPaymentSchema = object({
  paymentMethodId: pipe(string(), minLength(1, "paymentMethodId is required")),
  amount:          pipe(number(), minValue(0.01, "amount must be greater than 0")),
  paymentDate:     optional(string()),
  referenceNo:     optional(string()),
  notes:           optional(string()),
});

module.exports = { createPaymentSchema };
