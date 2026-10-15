const { object, string, pipe, minLength, optional } = require("valibot");

const createLeaveSchema = object({
  startDate:   pipe(string(), minLength(1, "Tanggal mulai wajib diisi")),
  endDate:     pipe(string(), minLength(1, "Tanggal selesai wajib diisi")),
  reason:      optional(string()),
  // Jenis cuti wajib dipilih supaya jatah cuti terpotong dengan benar
  leaveTypeId: pipe(string(), minLength(1, "Jenis cuti wajib dipilih")),
});

const rejectSchema = object({
  notes: optional(string()),
});

module.exports = { createLeaveSchema, rejectSchema };
