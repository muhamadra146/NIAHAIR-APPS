const { object, string, pipe, minLength, maxLength, trim } = require("valibot");

// trim: catatan berisi spasi saja ditolak (B7)
const noteField = pipe(
  string("Isi catatan wajib diisi"),
  trim(),
  minLength(1, "Isi catatan tidak boleh kosong"),
  maxLength(500, "Catatan maksimal 500 karakter"),
);

const createNoteSchema = object({ note: noteField });

const updateNoteSchema = object({ note: noteField });

module.exports = { createNoteSchema, updateNoteSchema };
