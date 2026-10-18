const { object, string, pipe, email, optional, nullable, boolean, minLength, maxLength, array, number, integer, minValue, maxValue, trim, toLowerCase, toUpperCase, check, regex, transform } = require("valibot");
const { wibDateStr } = require("../../utils/date");
const { PHONE_REGEX, PHONE_MESSAGE, cleanPhone, isRealDate } = require("../customer/customer.fields");

/** string kosong → null (kolom dikosongkan, B4) */
const emptyToNull = transform((v) => (v === "" ? null : v));

// Email disimpan huruf kecil tanpa spasi — tidak ada akun ganda karena beda huruf besar/kecil.
// "" / null = kosongkan (ditolak di service bila karyawan punya akun login)
const EMAIL = optional(nullable(pipe(
  string(),
  trim(),
  toLowerCase(),
  maxLength(100, "Email maksimal 100 karakter"),
  emptyToNull,
  nullable(pipe(string(), email("Format email tidak valid"))),
)));

/** Teks opsional: di-trim, "" = kosongkan */
const optionalText = (max, label) => optional(nullable(pipe(
  string(),
  trim(),
  maxLength(max, `${label} maksimal ${max} karakter`),
  emptyToNull,
)));

// No. HP: aturan sama dengan pelanggan (CRM-005) — pemisah dibuang, 08xx / 628xx
const PHONE = optional(nullable(pipe(
  string(),
  transform(cleanPhone),
  check((v) => v === "" || PHONE_REGEX.test(v), PHONE_MESSAGE),
  emptyToNull,
)));

// NIK KTP: tepat 16 digit bila diisi
const NIK = optional(nullable(pipe(
  string(),
  trim(),
  check((v) => v === "" || /^\d{16}$/.test(v), "NIK KTP harus 16 digit angka"),
  emptyToNull,
)));

/** Tanggal opsional: harus tanggal kalender yang ada (2026-02-31 ditolak); "" = kosongkan */
const dateField = (label, { notFuture = false } = {}) => optional(nullable(pipe(
  string(),
  trim(),
  check((v) => v === "" || isRealDate(v), `${label} tidak valid`),
  check((v) => !notFuture || v === "" || v.slice(0, 10) <= wibDateStr(), `${label} tidak boleh di masa depan`),
  emptyToNull,
)));

const NAME = (requiredMsg) => pipe(
  string(requiredMsg),
  trim(),
  minLength(1, requiredMsg),
  maxLength(100, "Nama maksimal 100 karakter"),
);

// Kode karyawan disimpan huruf besar (EMP-001)
const EMPLOYEE_CODE = optional(pipe(
  string(),
  trim(),
  toUpperCase(),
  maxLength(30, "Kode karyawan maksimal 30 karakter"),
  regex(/^[A-Z0-9@._-]*$/, "Kode karyawan hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung"),
));

const PAY_DAY = optional(nullable(pipe(
  number("Tanggal gajian harus angka"),
  integer("Tanggal gajian harus bilangan bulat"),
  minValue(1, "Tanggal gajian harus antara 1 dan 31"),
  maxValue(31, "Tanggal gajian harus antara 1 dan 31"),
)));

const COMMON = {
  employeeCode:      EMPLOYEE_CODE,
  phone:             PHONE,
  email:             EMAIL,
  hireDate:          dateField("Tanggal masuk"),
  birthDate:         dateField("Tanggal lahir", { notFuture: true }),
  address:           optionalText(500, "Alamat"),
  emergencyContact:  optionalText(150, "Kontak darurat"),
  nikKtp:            NIK,
  resignDate:        dateField("Tanggal resign"),
  commissionEnabled: optional(boolean()),
  homeBranchId:      optional(nullable(string())),
  payDay:            PAY_DAY,
  divisionId:        optional(nullable(string())),
  isDivisionManager: optional(boolean()),
};

const createEmployeeSchema = object({
  name:   NAME("Nama wajib diisi"),
  roleId: pipe(string("Role wajib dipilih"), minLength(1, "Role wajib dipilih")),
  ...COMMON,
});

const updateEmployeeSchema = object({
  name:     optional(NAME("Nama tidak boleh kosong")),
  roleId:   optional(string()),
  ...COMMON,
  isActive: optional(boolean()),
});

const updateEmployeeBranchesSchema = object({
  branchIds: array(pipe(string(), minLength(1, "Cabang wajib dipilih"))),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema, updateEmployeeBranchesSchema };
