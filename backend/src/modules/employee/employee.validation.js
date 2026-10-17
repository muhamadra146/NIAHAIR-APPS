const { object, string, pipe, email, optional, nullable, boolean, minLength, array, number, integer, minValue, maxValue, trim, toLowerCase } = require("valibot");

// Email disimpan huruf kecil tanpa spasi — tidak ada akun ganda karena beda huruf besar/kecil
const EMAIL = pipe(string(), trim(), toLowerCase(), email("Format email tidak valid"));

const createEmployeeSchema = object({
  name:              pipe(string(), minLength(1, "Nama wajib diisi")),
  roleId:            pipe(string(), minLength(1, "Role wajib dipilih")),
  employeeCode:      optional(string()),
  phone:             optional(string()),
  email:             optional(EMAIL),
  hireDate:          optional(string()),
  birthDate:         optional(string()),
  address:           optional(string()),
  emergencyContact:  optional(string()),
  nikKtp:            optional(string()),
  resignDate:        optional(string()),
  commissionEnabled: optional(boolean()),
  homeBranchId:      optional(nullable(string())),
  payDay:            optional(nullable(pipe(number(), integer(), minValue(1), maxValue(31)))),
  divisionId:        optional(nullable(string())),
  isDivisionManager: optional(boolean()),
});

const updateEmployeeSchema = object({
  name:              optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  roleId:            optional(string()),
  employeeCode:      optional(string()),
  phone:             optional(string()),
  email:             optional(EMAIL),
  hireDate:          optional(string()),
  birthDate:         optional(string()),
  address:           optional(string()),
  emergencyContact:  optional(string()),
  nikKtp:            optional(string()),
  resignDate:        optional(string()),
  commissionEnabled: optional(boolean()),
  isActive:          optional(boolean()),
  homeBranchId:      optional(nullable(string())),
  payDay:            optional(nullable(pipe(number(), integer(), minValue(1), maxValue(31)))),
  divisionId:        optional(nullable(string())),
  isDivisionManager: optional(boolean()),
});

const updateEmployeeBranchesSchema = object({
  branchIds: array(pipe(string(), minLength(1, "Cabang wajib dipilih"))),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema, updateEmployeeBranchesSchema };
