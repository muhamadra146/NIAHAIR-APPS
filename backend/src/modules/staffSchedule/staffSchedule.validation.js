const {
  object, array, string, pipe, minLength, optional, nullable, picklist,
} = require("valibot");

const scheduleItemSchema = object({
  employeeId: pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  date:       pipe(string(), minLength(1, "Tanggal wajib diisi")),
  shiftId:    optional(nullable(string())),
  status:     optional(nullable(picklist(["WORKING", "OFF", "LEAVE"]))),
  notes:      optional(nullable(string())),
});

const bulkScheduleSchema = object({
  branchId:  pipe(string(), minLength(1, "Cabang wajib dipilih")),
  schedules: array(scheduleItemSchema),
});

module.exports = { bulkScheduleSchema };
