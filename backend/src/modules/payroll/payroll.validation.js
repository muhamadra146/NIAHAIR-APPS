const { object, string, number, integer, minValue, maxValue, pipe, minLength, optional, regex } = require("valibot");

const generateSchema = object({
  employeeId:  pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  branchId:    pipe(string(), minLength(1, "Cabang wajib dipilih")),
  yearMonth:   optional(pipe(string(), regex(/^\d{4}-\d{2}$/, "Format harus TTTT-BB"))),
  periodStart: optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format harus TTTT-BB-HH"))),
  periodEnd:   optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format harus TTTT-BB-HH"))),
  // payDay: tanggal gajian (1-31), digunakan untuk menentukan periode gaji
  payDay:      optional(pipe(number(), integer("Tanggal gajian harus bilangan bulat"), minValue(1, "payDay min 1"), maxValue(31, "payDay max 31"))),
  notes:       optional(string()),
});

const bulkGenerateSchema = object({
  branchId:  pipe(string(), minLength(1, "Cabang wajib dipilih")),
  yearMonth: pipe(string(), regex(/^\d{4}-\d{2}$/, "Format harus TTTT-BB")),
  // payDay: filter karyawan berdasarkan tanggal gajian (1-31), opsional
  payDay:    optional(pipe(number(), integer("Tanggal gajian harus bilangan bulat"), minValue(1, "payDay min 1"), maxValue(31, "payDay max 31"))),
  notes:     optional(string()),
});

const updateNotesSchema = object({
  notes: optional(string()),
});

module.exports = { generateSchema, bulkGenerateSchema, updateNotesSchema };
