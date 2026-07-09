const { object, string, pipe, minLength } = require("valibot");

const createNoteSchema = object({
  note: pipe(string(), minLength(1, "Isi catatan tidak boleh kosong")),
});

module.exports = { createNoteSchema };
