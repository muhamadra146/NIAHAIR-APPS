const { object, string, pipe, minLength, optional, nullable, boolean, regex, trim } = require("valibot");

// Jam format HH:mm (00:00 – 23:59); kosong = shift tanpa jam (mis. libur)
const TIME = pipe(string("Format jam harus HH:mm (00:00 – 23:59)"), regex(/^(?:([01]\d|2[0-3]):[0-5]\d)?$/, "Format jam harus HH:mm (00:00 – 23:59)"));

const createShiftSchema = object({
  code:      pipe(string("Kode wajib diisi"), trim(), minLength(1, "Kode wajib diisi")),
  name:      pipe(string("Nama wajib diisi"), trim(), minLength(1, "Nama wajib diisi")),
  startTime: optional(TIME),
  endTime:   optional(TIME),
  color:     optional(string("Warna harus berupa teks")),
  isWorking: optional(boolean("Pilihan shift kerja tidak valid")),
}, "Data shift tidak valid");

const updateShiftSchema = object({
  code:      optional(pipe(string("Kode harus berupa teks"), trim(), minLength(1, "Kode tidak boleh kosong"))),
  name:      optional(pipe(string("Nama harus berupa teks"), trim(), minLength(1, "Nama tidak boleh kosong"))),
  startTime: optional(nullable(TIME)),
  endTime:   optional(nullable(TIME)),
  color:     optional(string("Warna harus berupa teks")),
  isWorking: optional(boolean("Pilihan shift kerja tidak valid")),
  isActive:  optional(boolean("Status aktif tidak valid")),
}, "Data shift tidak valid");

module.exports = { createShiftSchema, updateShiftSchema };
