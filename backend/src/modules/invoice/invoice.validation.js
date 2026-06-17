const { object, string, array, boolean, optional, pipe, minLength, number, minValue, picklist } = require("valibot");

const itemSchema = object({
  itemId:          pipe(string(), minLength(1, "itemId is required")),
  unitId:          pipe(string(), minLength(1, "unitId is required")),
  qty:             pipe(number(), minValue(0.01, "qty must be greater than 0")),
  price:           optional(number()),
  discountType:    optional(picklist(["AMOUNT", "PERCENT"])),
  discountAmount:  optional(pipe(number(), minValue(0))),
  discountPercent: optional(pipe(number(), minValue(0))),
  taxable:         optional(boolean()),
});

const createInvoiceSchema = object({
  customerId:             pipe(string(), minLength(1, "customerId is required")),
  branchId:               optional(string()),
  appointmentId:          optional(string()),
  treatmentSessionIds:    optional(array(string())),
  deposits:               optional(array(object({
    depositId: pipe(string(), minLength(1, "depositId is required")),
    amount:    pipe(number(), minValue(0.01, "deposit amount must be greater than 0")),
  }))),
  notes:                  optional(string()),
  taxable:                optional(boolean()),
  inclusiveTax:           optional(boolean()),
  membershipDiscountTotal: optional(pipe(number(), minValue(0))),
  items:                  pipe(array(itemSchema), minLength(1, "At least one item is required")),
});

const applyDepositSchema = object({
  depositId: pipe(string(), minLength(1, "depositId is required")),
  amount:    pipe(number(), minValue(0.01, "amount must be greater than 0")),
});

const updateInvoiceSchema = object({
  items:        pipe(array(itemSchema), minLength(1, "At least one item is required")),
  notes:        optional(string()),
  taxable:      optional(boolean()),
  inclusiveTax: optional(boolean()),
});

module.exports = { createInvoiceSchema, applyDepositSchema, updateInvoiceSchema };
