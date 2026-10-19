const { object, string, pipe, minLength, optional, nullish, number, picklist, check, trim } = require("valibot");

const ATTENDANCE_STATUS = ["PRESENT", "LATE", "ABSENT", "HALF_DAY", "EARLY_LEAVE"];
const DATE_TIME = pipe(
  string("Format tanggal/jam tidak valid"),
  check((v) => !Number.isNaN(Date.parse(v)), "Format tanggal/jam tidak valid"),
);
const SCHEDULE_ID = pipe(string("Jadwal wajib dipilih"), minLength(1, "Jadwal wajib dipilih"));
const COORD       = optional(number("Koordinat lokasi harus berupa angka"));

const checkInSchema = object({
  staffScheduleId: SCHEDULE_ID,
  latitude:        COORD,
  longitude:       COORD,
  photoUrl:        optional(string("Foto tidak valid")),
  notes:           optional(string("Catatan harus berupa teks")),
}, "Data absen tidak valid");

const checkOutSchema = object({
  staffScheduleId: SCHEDULE_ID,
  latitude:        COORD,
  longitude:       COORD,
  photoUrl:        optional(string("Foto tidak valid")),
  notes:           optional(string("Catatan harus berupa teks")),
}, "Data absen tidak valid");

// EMP-011: absensi manual wajib disertai alasan.
// Jam: tidak dikirim = pakai nilai lama, null = dikosongkan. Status dihitung otomatis dari jam
// (hanya ABSENT yang boleh dipilih manual) — lihat attendance.service manualSet.
const manualSetSchema = object({
  staffScheduleId: SCHEDULE_ID,
  status:          optional(picklist(ATTENDANCE_STATUS, "Status absensi tidak valid")),
  checkInAt:       nullish(DATE_TIME),
  checkOutAt:      nullish(DATE_TIME),
  notes:           pipe(string("Alasan wajib diisi"), trim(), minLength(3, "Alasan minimal 3 karakter")),
}, "Data absensi tidak valid");

module.exports = { checkInSchema, checkOutSchema, manualSetSchema };
