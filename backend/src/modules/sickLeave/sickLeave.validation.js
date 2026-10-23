const { object, string, boolean, pipe, minLength, optional } = require("valibot");

// Pesan Bahasa Indonesia juga untuk galat tipe (bawaan Valibot berbahasa Inggris)
const createSickLeaveSchema = object({
  startDate:  pipe(string("Tanggal mulai wajib diisi"), minLength(1, "Tanggal mulai wajib diisi")),
  endDate:    pipe(string("Tanggal selesai wajib diisi"), minLength(1, "Tanggal selesai wajib diisi")),
  hasLetter:  optional(boolean("Pilihan surat dokter tidak valid")),
  letterDate: optional(string("Tanggal surat harus berupa teks")),
  doctorName: optional(string("Nama dokter harus berupa teks")),
  diagnosis:  optional(string("Diagnosa harus berupa teks")),
  clinicName: optional(string("Nama klinik harus berupa teks")),
}, "Data sakit tidak valid");

const reviewSickLeaveSchema = object({
  reviewNote: optional(string("Catatan harus berupa teks")),
}, "Data tidak valid");

module.exports = { createSickLeaveSchema, reviewSickLeaveSchema };
