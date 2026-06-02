const { object, string, pipe, optional, boolean, minLength, picklist, number, minValue } = require("valibot");

const createCommissionRuleSchema = object({
  employeeId:           pipe(string(), minLength(1, "Employee ID is required")),
  commissionCategoryId: pipe(string(), minLength(1, "Commission category ID is required")),
  commissionType:       picklist(["PERCENTAGE", "FIXED_AMOUNT"], "Commission type must be PERCENTAGE or FIXED_AMOUNT"),
  commissionValue:      pipe(number("Commission value must be a number"), minValue(0.01, "Commission value must be positive")),
  effectiveDate:        pipe(string(), minLength(1, "Effective date is required")),
  endDate:              optional(string()),
  isActive:             optional(boolean()),
});

const updateCommissionRuleSchema = object({
  employeeId:           optional(pipe(string(), minLength(1, "Employee ID cannot be empty"))),
  commissionCategoryId: optional(pipe(string(), minLength(1, "Commission category ID cannot be empty"))),
  commissionType:       optional(picklist(["PERCENTAGE", "FIXED_AMOUNT"], "Commission type must be PERCENTAGE or FIXED_AMOUNT")),
  commissionValue:      optional(pipe(number("Commission value must be a number"), minValue(0.01, "Commission value must be positive"))),
  effectiveDate:        optional(pipe(string(), minLength(1, "Effective date cannot be empty"))),
  endDate:              optional(string()),
  isActive:             optional(boolean()),
});

module.exports = { createCommissionRuleSchema, updateCommissionRuleSchema };
