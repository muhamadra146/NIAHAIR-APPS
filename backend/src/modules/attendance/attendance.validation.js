const { object, string, pipe, minLength, optional, number, picklist, check, trim } = require("valibot");

const ATTENDANCE_STATUS = ["PRESENT", "LATE", "ABSENT", "HALF_DAY", "EARLY_LEAVE"];
const DATE_TIME = pipe(string(), check((v) => !Number.isNaN(Date.parse(v)), "Format tanggal/jam tidak valid"));

const checkInSchema = object({
  staffScheduleId: pipe(string(), minLength(1, "Jadwal wajib dipilih")),
  latitude:        optional(number()),
  longitude:       optional(number()),
  photoUrl:        optional(string()),
  notes:           optional(string()),
});

const checkOutSchema = object({
  staffScheduleId: pipe(string(), minLength(1, "Jadwal wajib dipilih")),
  latitude:        optional(number()),
  longitude:       optional(number()),
  photoUrl:        optional(string()),
  notes:           optional(string()),
});

// EMP-011: absensi manual wajib disertai alasan
const manualSetSchema = object({
  staffScheduleId: pipe(string(), minLength(1, "Jadwal wajib dipilih")),
  status:          optional(picklist(ATTENDANCE_STATUS, "Status absensi tidak valid")),
  checkInAt:       optional(DATE_TIME),
  checkOutAt:      optional(DATE_TIME),
  notes:           pipe(string("Alasan wajib diisi"), trim(), minLength(3, "Alasan minimal 3 karakter")),
});

module.exports = { checkInSchema, checkOutSchema, manualSetSchema };
