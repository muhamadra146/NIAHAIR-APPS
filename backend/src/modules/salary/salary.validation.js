const { object, string, number, pipe, minLength, optional, boolean, minValue } = require("valibot");

const createSalarySchema = object({
  employeeId:                    pipe(string(), minLength(1, "Employee ID is required")),
  baseSalary:                    pipe(number(), minValue(0, "Must be >= 0")),
  mealAllowancePerDay:           optional(pipe(number(), minValue(0))),
  transportAllowance:            optional(pipe(number(), minValue(0))),
  overtimeRatePerHour:           optional(pipe(number(), minValue(0))),
  holidayOvertimeRate:           optional(pipe(number(), minValue(0))),
  lateDeductionPerMinute:        optional(pipe(number(), minValue(0))),
  lateDeductionBracket1:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket2:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket3:         optional(pipe(number(), minValue(0))),
  absentDeductionPerDay:         optional(pipe(number(), minValue(0))),
  earlyLeaveDeductionPerMinute:  optional(pipe(number(), minValue(0))),
  bpjsJhtPercent:                optional(pipe(number(), minValue(0))),
  bpjsJpPercent:                 optional(pipe(number(), minValue(0))),
  bpjsKesehatanEmployeePercent:  optional(pipe(number(), minValue(0))),
  bpjsKesehatanEmployerPercent:  optional(pipe(number(), minValue(0))),
  effectiveDate:                 pipe(string(), minLength(1, "Effective date is required")),
  endDate:                       optional(string()),
  isActive:                      optional(boolean()),
  notes:                         optional(string()),
});

const updateSalarySchema = object({
  baseSalary:                    optional(pipe(number(), minValue(0))),
  mealAllowancePerDay:           optional(pipe(number(), minValue(0))),
  transportAllowance:            optional(pipe(number(), minValue(0))),
  overtimeRatePerHour:           optional(pipe(number(), minValue(0))),
  holidayOvertimeRate:           optional(pipe(number(), minValue(0))),
  lateDeductionPerMinute:        optional(pipe(number(), minValue(0))),
  lateDeductionBracket1:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket2:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket3:         optional(pipe(number(), minValue(0))),
  absentDeductionPerDay:         optional(pipe(number(), minValue(0))),
  earlyLeaveDeductionPerMinute:  optional(pipe(number(), minValue(0))),
  bpjsJhtPercent:                optional(pipe(number(), minValue(0))),
  bpjsJpPercent:                 optional(pipe(number(), minValue(0))),
  bpjsKesehatanEmployeePercent:  optional(pipe(number(), minValue(0))),
  bpjsKesehatanEmployerPercent:  optional(pipe(number(), minValue(0))),
  effectiveDate:                 optional(string()),
  endDate:                       optional(string()),
  isActive:                      optional(boolean()),
  notes:                         optional(string()),
});

module.exports = { createSalarySchema, updateSalarySchema };
