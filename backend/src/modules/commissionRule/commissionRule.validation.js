const { object, string, pipe, optional, boolean, minLength, picklist, number, minValue } = require("valibot");

const createCommissionRuleSchema = object({
  employeeId:           pipe(string(), minLength(1, "Employee ID is required")),
  commissionCategoryId: pipe(string(), minLength(1, "Commission category ID is required")),
  slotKey:              optional(string()),
  commissionType:       picklist(["PERCENTAGE", "FIXED"], "Commission type must be PERCENTAGE or FIXED"),
  commissionValue:      pipe(number("Commission value must be a number"), minValue(0.01, "Commission value must be positive")),
  commissionBase:       optional(picklist(["BEFORE_DISCOUNT_BEFORE_TAX", "AFTER_DISCOUNT_BEFORE_TAX", "BEFORE_DISCOUNT_AFTER_TAX", "AFTER_DISCOUNT_AFTER_TAX", "BEFORE_DISCOUNT", "AFTER_DISCOUNT"], "Invalid commission base")),
  effectiveDate:        pipe(string(), minLength(1, "Effective date is required")),
  endDate:              optional(string()),
  isActive:             optional(boolean()),
});

const updateCommissionRuleSchema = object({
  employeeId:           optional(pipe(string(), minLength(1, "Employee ID cannot be empty"))),
  commissionCategoryId: optional(pipe(string(), minLength(1, "Commission category ID cannot be empty"))),
  commissionType:       optional(picklist(["PERCENTAGE", "FIXED"], "Commission type must be PERCENTAGE or FIXED")),
  commissionValue:      optional(pipe(number("Commission value must be a number"), minValue(0.01, "Commission value must be positive"))),
  commissionBase:       optional(picklist(["BEFORE_DISCOUNT_BEFORE_TAX", "AFTER_DISCOUNT_BEFORE_TAX", "BEFORE_DISCOUNT_AFTER_TAX", "AFTER_DISCOUNT_AFTER_TAX", "BEFORE_DISCOUNT", "AFTER_DISCOUNT"], "Invalid commission base")),
  effectiveDate:        optional(pipe(string(), minLength(1, "Effective date cannot be empty"))),
  endDate:              optional(string()),
  isActive:             optional(boolean()),
});

module.exports = { createCommissionRuleSchema, updateCommissionRuleSchema };
