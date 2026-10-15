const { object, string, number, pipe, minLength, optional, minValue } = require("valibot");

const createLoanSchema = object({
  employeeId:       pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  branchId:         pipe(string(), minLength(1, "Cabang wajib dipilih")),
  totalAmount:      pipe(number(), minValue(1, "Total harus lebih dari 0")),
  monthlyDeduction: pipe(number(), minValue(1, "Potongan per bulan harus lebih dari 0")),
  startDate:        pipe(string(), minLength(1, "Tanggal mulai wajib diisi")),
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
  amount:    pipe(number(), minValue(0.01, "Nominal harus lebih dari 0")),
  paidAt:    pipe(string(), minLength(1, "Tanggal bayar wajib diisi")),
  notes:     optional(string()),
  payrollId: optional(string()),
});

module.exports = { createLoanSchema, updateLoanSchema, addRepaymentSchema };
