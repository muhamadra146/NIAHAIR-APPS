const {
  object, array, string, pipe, minLength, optional, nullable, picklist,
} = require("valibot");

// Status yang boleh diatur manual di roster. CUTI (LEAVE) / IZIN / SAKIT hanya berasal dari
// pengajuan yang disetujui (keputusan user 2026-10-19) — tetap ditampilkan, tidak bisa diset di sini.
const MANUAL_STATUSES = ["WORKING", "OFF"];

const scheduleItemSchema = object({
  employeeId: pipe(string("Karyawan wajib dipilih"), minLength(1, "Karyawan wajib dipilih")),
  date:       pipe(string("Tanggal wajib diisi"), minLength(1, "Tanggal wajib diisi")),
  shiftId:    optional(nullable(string("Shift tidak valid"))),
  status:     optional(nullable(picklist(
    MANUAL_STATUSES,
    "Status jadwal hanya boleh Masuk (WORKING) atau OFF — Cuti / Izin / Sakit berasal dari pengajuan yang disetujui",
  ))),
  notes:      optional(nullable(string("Catatan harus berupa teks"))),
}, "Data jadwal tidak valid");

const bulkScheduleSchema = object({
  branchId:  pipe(string("Cabang wajib dipilih"), minLength(1, "Cabang wajib dipilih")),
  schedules: array(scheduleItemSchema, "Daftar jadwal tidak valid"),
}, "Data jadwal tidak valid");

module.exports = { bulkScheduleSchema, MANUAL_STATUSES };
