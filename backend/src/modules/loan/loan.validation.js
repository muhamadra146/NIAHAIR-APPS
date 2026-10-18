const { object, string, number, pipe, minLength, optional, minValue, maxValue } = require("valibot");

// Batas nominal kasbon. Kolom Loan.totalAmount / monthlyDeduction = Decimal(18, 2) → maks 16 digit
// sebelum koma (< 10^16). Angka JS hanya presisi sampai 2^53 ≈ 9,007 × 10^15, jadi batas aman yang
// masih muat di DB dan tetap presisi rupiah adalah 15 digit (999.999.999.999.999).
// Di atas batas ini sebelumnya DB menolak → error 500.
const MAX_LOAN_AMOUNT = 999_999_999_999_999;
const MAX_LOAN_MSG    = "Nominal melebihi batas maksimal Rp 999.999.999.999.999";

const createLoanSchema = object({
  employeeId:       pipe(string("Karyawan wajib dipilih"), minLength(1, "Karyawan wajib dipilih")),
  branchId:         pipe(string("Cabang wajib dipilih"), minLength(1, "Cabang wajib dipilih")),
  totalAmount:      pipe(number("Total kasbon harus berupa angka"), minValue(1, "Total harus lebih dari 0"), maxValue(MAX_LOAN_AMOUNT, MAX_LOAN_MSG)),
  monthlyDeduction: pipe(number("Potongan per bulan harus berupa angka"), minValue(1, "Potongan per bulan harus lebih dari 0"), maxValue(MAX_LOAN_AMOUNT, MAX_LOAN_MSG)),
  startDate:        pipe(string("Tanggal mulai wajib diisi"), minLength(1, "Tanggal mulai wajib diisi")),
  endDate:          optional(string("Tanggal selesai tidak valid")),
  notes:            optional(string("Catatan harus berupa teks")),
});

const updateLoanSchema = object({
  monthlyDeduction: optional(pipe(number("Potongan per bulan harus berupa angka"), minValue(1, "Potongan per bulan harus lebih dari 0"), maxValue(MAX_LOAN_AMOUNT, MAX_LOAN_MSG))),
  endDate:          optional(string("Tanggal selesai tidak valid")),
  notes:            optional(string("Catatan harus berupa teks")),
  status:           optional(string()),
});

const addRepaymentSchema = object({
  amount:    pipe(number("Nominal harus berupa angka"), minValue(0.01, "Nominal harus lebih dari 0"), maxValue(MAX_LOAN_AMOUNT, MAX_LOAN_MSG)),
  paidAt:    pipe(string("Tanggal bayar wajib diisi"), minLength(1, "Tanggal bayar wajib diisi")),
  notes:     optional(string("Catatan harus berupa teks")),
  payrollId: optional(string()),
});

module.exports = { createLoanSchema, updateLoanSchema, addRepaymentSchema, MAX_LOAN_AMOUNT };
