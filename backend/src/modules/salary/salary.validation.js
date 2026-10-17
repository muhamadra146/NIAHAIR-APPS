const { object, string, number, pipe, minLength, optional, boolean, minValue, maxValue } = require("valibot");

// Persen BPJS 0..100
const percent = pipe(number("Persen BPJS harus angka"), minValue(0, "Persen BPJS tidak boleh negatif"), maxValue(100, "Persen BPJS maksimal 100"));

const createSalarySchema = object({
  employeeId:                    pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  baseSalary:                    pipe(number(), minValue(0, "Tidak boleh negatif")),
  mealAllowancePerDay:           optional(pipe(number(), minValue(0))),
  tunjangan:                     optional(pipe(number(), minValue(0))),
  transportAllowance:            optional(pipe(number(), minValue(0))),
  overtimeRatePerHour:           optional(pipe(number(), minValue(0))),
  holidayRatePerDay:           optional(pipe(number(), minValue(0))),
  lateDeductionPerMinute:        optional(pipe(number(), minValue(0))),
  lateDeductionBracket1:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket2:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket3:         optional(pipe(number(), minValue(0))),
  absentDeductionPerDay:         optional(pipe(number(), minValue(0))),
  earlyLeaveDeductionPerMinute:  optional(pipe(number(), minValue(0))),
  bpjsJhtPercent:                optional(percent),
  bpjsJhtEmployerPercent:        optional(percent),
  bpjsJpPercent:                 optional(percent),
  bpjsJpEmployerPercent:         optional(percent),
  bpjsKesehatanEmployeePercent:  optional(percent),
  bpjsKesehatanEmployerPercent:  optional(percent),
  effectiveDate:                 pipe(string(), minLength(1, "Tanggal berlaku wajib diisi")),
  endDate:                       optional(string()),
  isActive:                      optional(boolean()),
  notes:                         optional(string()),
});

const updateSalarySchema = object({
  baseSalary:                    optional(pipe(number(), minValue(0))),
  mealAllowancePerDay:           optional(pipe(number(), minValue(0))),
  tunjangan:                     optional(pipe(number(), minValue(0))),
  transportAllowance:            optional(pipe(number(), minValue(0))),
  overtimeRatePerHour:           optional(pipe(number(), minValue(0))),
  holidayRatePerDay:           optional(pipe(number(), minValue(0))),
  lateDeductionPerMinute:        optional(pipe(number(), minValue(0))),
  lateDeductionBracket1:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket2:         optional(pipe(number(), minValue(0))),
  lateDeductionBracket3:         optional(pipe(number(), minValue(0))),
  absentDeductionPerDay:         optional(pipe(number(), minValue(0))),
  earlyLeaveDeductionPerMinute:  optional(pipe(number(), minValue(0))),
  bpjsJhtPercent:                optional(percent),
  bpjsJhtEmployerPercent:        optional(percent),
  bpjsJpPercent:                 optional(percent),
  bpjsJpEmployerPercent:         optional(percent),
  bpjsKesehatanEmployeePercent:  optional(percent),
  bpjsKesehatanEmployerPercent:  optional(percent),
  effectiveDate:                 optional(string()),
  endDate:                       optional(string()),
  isActive:                      optional(boolean()),
  notes:                         optional(string()),
});

module.exports = { createSalarySchema, updateSalarySchema };
