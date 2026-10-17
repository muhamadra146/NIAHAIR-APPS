const { object, string, pipe, minLength, optional, nullable, boolean, regex, trim } = require("valibot");

// Jam format HH:mm (00:00 – 23:59); kosong = shift tanpa jam (mis. libur)
const TIME = pipe(string(), regex(/^(?:([01]\d|2[0-3]):[0-5]\d)?$/, "Format jam harus HH:mm (00:00 – 23:59)"));

const createShiftSchema = object({
  code:      pipe(string(), trim(), minLength(1, "Kode wajib diisi")),
  name:      pipe(string(), trim(), minLength(1, "Nama wajib diisi")),
  startTime: optional(TIME),
  endTime:   optional(TIME),
  color:     optional(string()),
  isWorking: optional(boolean()),
});

const updateShiftSchema = object({
  code:      optional(pipe(string(), trim(), minLength(1, "Kode tidak boleh kosong"))),
  name:      optional(pipe(string(), trim(), minLength(1, "Nama tidak boleh kosong"))),
  startTime: optional(nullable(TIME)),
  endTime:   optional(nullable(TIME)),
  color:     optional(string()),
  isWorking: optional(boolean()),
  isActive:  optional(boolean()),
});

module.exports = { createShiftSchema, updateShiftSchema };
