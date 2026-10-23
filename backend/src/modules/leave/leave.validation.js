const { object, string, pipe, minLength, optional } = require("valibot");

// Pesan Bahasa Indonesia juga untuk galat tipe (bawaan Valibot berbahasa Inggris)
const createLeaveSchema = object({
  startDate:   pipe(string("Tanggal mulai wajib diisi"), minLength(1, "Tanggal mulai wajib diisi")),
  endDate:     pipe(string("Tanggal selesai wajib diisi"), minLength(1, "Tanggal selesai wajib diisi")),
  reason:      optional(string("Alasan harus berupa teks")),
  // Jenis cuti wajib dipilih supaya jatah cuti terpotong dengan benar
  leaveTypeId: pipe(string("Jenis cuti wajib dipilih"), minLength(1, "Jenis cuti wajib dipilih")),
}, "Data cuti tidak valid");

const rejectSchema = object({
  notes: optional(string("Catatan harus berupa teks")),
}, "Data tidak valid");

module.exports = { createLeaveSchema, rejectSchema };
