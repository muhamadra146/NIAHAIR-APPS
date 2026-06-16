const { object, string, boolean, pipe, minLength, optional } = require("valibot");

const createSickLeaveSchema = object({
  startDate:  pipe(string(), minLength(1, "Tanggal mulai wajib diisi")),
  endDate:    pipe(string(), minLength(1, "Tanggal selesai wajib diisi")),
  hasLetter:  optional(boolean()),
  letterDate: optional(string()),
  doctorName: optional(string()),
  diagnosis:  optional(string()),
  clinicName: optional(string()),
});

const reviewSickLeaveSchema = object({
  reviewNote: optional(string()),
});

module.exports = { createSickLeaveSchema, reviewSickLeaveSchema };
