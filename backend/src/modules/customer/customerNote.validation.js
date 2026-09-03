const { object, string, pipe, minLength, maxLength } = require("valibot");

const createNoteSchema = object({
  note: pipe(
    string(),
    minLength(1, "Isi catatan tidak boleh kosong"),
    maxLength(500, "Catatan maksimal 500 karakter"),
  ),
});

const updateNoteSchema = object({
  note: pipe(
    string(),
    minLength(1, "Isi catatan tidak boleh kosong"),
    maxLength(500, "Catatan maksimal 500 karakter"),
  ),
});

module.exports = { createNoteSchema, updateNoteSchema };
