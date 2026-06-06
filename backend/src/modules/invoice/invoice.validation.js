const { object, string, array, optional, pipe, minLength, number, minValue } = require("valibot");

const createInvoiceSchema = object({
  customerId:          pipe(string(), minLength(1, "customerId is required")),
  branchId:            optional(string()),   // deprecated: injected from X-Branch-Id header
  appointmentId:       optional(string()),
  treatmentSessionIds: optional(array(string())),
  depositIds:          optional(array(string())),
  notes:               optional(string()),
  items: pipe(
    array(
      object({
        itemId:         pipe(string(), minLength(1, "itemId is required")),
        unitId:         pipe(string(), minLength(1, "unitId is required")),
        qty:            pipe(number(), minValue(0.01, "qty must be greater than 0")),
        discountAmount: optional(number()),
      })
    ),
    minLength(1, "At least one item is required")
  ),
});

module.exports = { createInvoiceSchema };
