const { object, string, number, pipe, minLength, optional, boolean, minValue, maxValue } = require("valibot");

// Persen BPJS 0..100
const percent = pipe(number("Persen BPJS harus angka"), minValue(0, "Persen BPJS tidak boleh negatif"), maxValue(100, "Persen BPJS maksimal 100"));

// Nominal rupiah ≥ 0 — pesan memakai nama field agar jelas mana yang salah
const money = (label) => pipe(number(`${label} harus berupa angka`), minValue(0, `${label} tidak boleh negatif`));

const MONEY_FIELDS = {
  mealAllowancePerDay:          "Uang makan per hari",
  tunjangan:                    "Tunjangan",
  transportAllowance:           "Uang transport",
  overtimeRatePerHour:          "Tarif lembur per jam",
  holidayRatePerDay:            "Tarif masuk hari libur",
  lateDeductionPerMinute:       "Potongan terlambat per menit",
  lateDeductionBracket1:        "Potongan terlambat tahap 1",
  lateDeductionBracket2:        "Potongan terlambat tahap 2",
  lateDeductionBracket3:        "Potongan terlambat tahap 3",
  absentDeductionPerDay:        "Potongan absen per hari",
  earlyLeaveDeductionPerMinute: "Potongan pulang cepat per menit",
};
const optionalMoney = Object.fromEntries(
  Object.entries(MONEY_FIELDS).map(([key, label]) => [key, optional(money(label))]),
);

const bpjsFields = {
  bpjsJhtPercent:                optional(percent),
  bpjsJhtEmployerPercent:        optional(percent),
  bpjsJpPercent:                 optional(percent),
  bpjsJpEmployerPercent:         optional(percent),
  bpjsKesehatanEmployeePercent:  optional(percent),
  bpjsKesehatanEmployerPercent:  optional(percent),
};

const createSalarySchema = object({
  employeeId:    pipe(string("Karyawan wajib dipilih"), minLength(1, "Karyawan wajib dipilih")),
  baseSalary:    money("Gaji pokok"),
  ...optionalMoney,
  ...bpjsFields,
  effectiveDate: pipe(string("Tanggal berlaku wajib diisi"), minLength(1, "Tanggal berlaku wajib diisi")),
  endDate:       optional(string("Tanggal selesai tidak valid")),
  isActive:      optional(boolean("Status aktif harus ya/tidak")),
  notes:         optional(string("Catatan harus berupa teks")),
});

const updateSalarySchema = object({
  baseSalary:    optional(money("Gaji pokok")),
  ...optionalMoney,
  ...bpjsFields,
  effectiveDate: optional(string("Tanggal berlaku tidak valid")),
  endDate:       optional(string("Tanggal selesai tidak valid")),
  isActive:      optional(boolean("Status aktif harus ya/tidak")),
  notes:         optional(string("Catatan harus berupa teks")),
});

module.exports = { createSalarySchema, updateSalarySchema };
