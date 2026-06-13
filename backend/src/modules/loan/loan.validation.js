const { object, string, number, pipe, minLength, optional, minValue } = require("valibot");

const createLoanSchema = object({
  employeeId:       pipe(string(), minLength(1, "Employee ID is required")),
  branchId:         pipe(string(), minLength(1, "Branch ID is required")),
  totalAmount:      pipe(number(), minValue(1, "Total amount must be > 0")),
  monthlyDeduction: pipe(number(), minValue(1, "Monthly deduction must be > 0")),
  startDate:        pipe(string(), minLength(1, "Start date is required")),
  endDate:          optional(string()),
  notes:            optional(string()),
});

const updateLoanSchema = object({
  monthlyDeduction: optional(pipe(number(), minValue(1))),
  endDate:          optional(string()),
  notes:            optional(string()),
  status:           optional(string()),
});

const addRepaymentSchema = object({
  amount:    pipe(number(), minValue(0.01, "Amount must be > 0")),
  paidAt:    pipe(string(), minLength(1, "Paid date is required")),
  notes:     optional(string()),
  payrollId: optional(string()),
});

module.exports = { createLoanSchema, updateLoanSchema, addRepaymentSchema };
