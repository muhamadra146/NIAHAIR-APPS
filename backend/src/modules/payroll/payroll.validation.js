const { object, string, number, integer, minValue, maxValue, pipe, minLength, optional, regex } = require("valibot");

const generateSchema = object({
  employeeId:  pipe(string(), minLength(1, "Employee ID is required")),
  branchId:    pipe(string(), minLength(1, "Branch ID is required")),
  yearMonth:   optional(pipe(string(), regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"))),
  periodStart: optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"))),
  periodEnd:   optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"))),
  // payDay: tanggal gajian (1-31), digunakan untuk menentukan periode gaji
  payDay:      optional(pipe(number(), integer("payDay must be an integer"), minValue(1, "payDay min 1"), maxValue(31, "payDay max 31"))),
  notes:       optional(string()),
});

const bulkGenerateSchema = object({
  branchId:  pipe(string(), minLength(1, "Branch ID is required")),
  yearMonth: pipe(string(), regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM")),
  // payDay: filter karyawan berdasarkan tanggal gajian (1-31), opsional
  payDay:    optional(pipe(number(), integer("payDay must be an integer"), minValue(1, "payDay min 1"), maxValue(31, "payDay max 31"))),
  notes:     optional(string()),
});

const updateNotesSchema = object({
  notes: optional(string()),
});

module.exports = { generateSchema, bulkGenerateSchema, updateNotesSchema };
