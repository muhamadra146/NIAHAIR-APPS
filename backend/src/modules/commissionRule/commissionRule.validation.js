const { object, string, pipe, optional, nullable, boolean, minLength, picklist, number, minValue } = require("valibot");

const BASE_OPTIONS = ["BEFORE_DISCOUNT_BEFORE_TAX", "AFTER_DISCOUNT_BEFORE_TAX", "BEFORE_DISCOUNT_AFTER_TAX", "AFTER_DISCOUNT_AFTER_TAX", "BEFORE_DISCOUNT", "AFTER_DISCOUNT"];

const createCommissionRuleSchema = object({
  employeeId:           pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  commissionCategoryId: pipe(string(), minLength(1, "Kategori komisi wajib dipilih")),
  slotKey:              optional(nullable(string())),          // null = tidak ada slot (job baru)
  commissionJobId:      optional(nullable(string())),          // null = rule untuk kategori umum
  commissionType:       picklist(["PERCENTAGE", "FIXED"], "Tipe komisi harus persentase atau nominal"),
  commissionValue:      pipe(number("Nilai komisi harus berupa angka"), minValue(0.01, "Nilai komisi harus lebih dari 0")),
  commissionBase:       optional(nullable(picklist(BASE_OPTIONS, "Dasar komisi tidak valid"))),
  effectiveDate:        pipe(string(), minLength(1, "Tanggal berlaku wajib diisi")),
  endDate:              optional(nullable(string())),
  isActive:             optional(boolean()),
});

const updateCommissionRuleSchema = object({
  employeeId:           optional(pipe(string(), minLength(1, "Karyawan tidak boleh kosong"))),
  commissionCategoryId: optional(pipe(string(), minLength(1, "Kategori komisi tidak boleh kosong"))),
  commissionJobId:      optional(nullable(string())),
  commissionType:       optional(picklist(["PERCENTAGE", "FIXED"], "Tipe komisi harus persentase atau nominal")),
  commissionValue:      optional(pipe(number("Nilai komisi harus berupa angka"), minValue(0.01, "Nilai komisi harus lebih dari 0"))),
  commissionBase:       optional(nullable(picklist(BASE_OPTIONS, "Dasar komisi tidak valid"))),
  effectiveDate:        optional(pipe(string(), minLength(1, "Tanggal berlaku tidak boleh kosong"))),
  endDate:              optional(nullable(string())),
  isActive:             optional(boolean()),
});

module.exports = { createCommissionRuleSchema, updateCommissionRuleSchema };
