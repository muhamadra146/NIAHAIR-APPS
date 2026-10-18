const { object, string, number, integer, minValue, maxValue, pipe, minLength, optional, regex, safeParse } = require("valibot");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");

// Tanggal gajian karyawan: bilangan bulat 1–31
const PAY_DAY_MESSAGE = "Tanggal gajian harus bilangan bulat 1–31";
const payDaySchema = pipe(
  number(PAY_DAY_MESSAGE),
  integer(PAY_DAY_MESSAGE),
  minValue(1, PAY_DAY_MESSAGE),
  maxValue(31, PAY_DAY_MESSAGE),
);

const generateSchema = object({
  employeeId:  pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  branchId:    pipe(string(), minLength(1, "Cabang wajib dipilih")),
  yearMonth:   optional(pipe(string(), regex(/^\d{4}-\d{2}$/, "Format harus TTTT-BB"))),
  periodStart: optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format harus TTTT-BB-HH"))),
  periodEnd:   optional(pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, "Format harus TTTT-BB-HH"))),
  // payDay: tanggal gajian (1-31), digunakan untuk menentukan periode gaji
  payDay:      optional(payDaySchema),
  notes:       optional(string()),
});

const bulkGenerateSchema = object({
  branchId:  pipe(string("Cabang wajib dipilih"), minLength(1, "Cabang wajib dipilih")),
  yearMonth: pipe(string("Bulan gaji wajib diisi"), regex(/^\d{4}-\d{2}$/, "Format bulan gaji harus TTTT-BB")),
  // payDay: filter karyawan berdasarkan tanggal gajian (1-31), opsional
  payDay:    optional(payDaySchema),
  notes:     optional(string()),
});

const updateNotesSchema = object({
  notes: optional(string()),
});

/**
 * Validasi body dengan pesan utama = pesan masalah pertama (mis. "Tanggal gajian harus bilangan bulat 1–31"),
 * bukan "Data tidak valid" umum, supaya toast di layar langsung jelas. Detail tetap di `errors`.
 */
const validateBody = (schema) => (req, _res, next) => {
  const result = safeParse(schema, req.body);
  if (result.success) {
    req.body = result.output;
    return next();
  }
  const errors = result.issues.map((issue) => ({
    field:   issue.path?.map((p) => p.key).join(".") ?? "value",
    message: issue.message,
  }));
  return next(new AppError(errors[0]?.message ?? "Data tidak valid", StatusCodes.UNPROCESSABLE_ENTITY, errors));
};

module.exports = { generateSchema, bulkGenerateSchema, updateNotesSchema, validateBody, PAY_DAY_MESSAGE };
