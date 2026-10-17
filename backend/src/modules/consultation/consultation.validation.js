const { object, string, array, optional, pipe, minLength } = require("valibot");

// Field wajib: kunci yang tidak dikirim diperlakukan sama dengan kosong agar pesan tetap Bahasa Indonesia
const requiredString = (message) => pipe(optional(string(message), ""), minLength(1, message));

const noteFields = {
  profession:             optional(string()),
  professionOther:        optional(string()),
  ageRange:               optional(string()),
  dailyStyling:           optional(array(string())),
  dailyStylingOther:      optional(string()),
  discoveryChannel:       optional(string()),
  discoveryChannelDetail: optional(string()),
  reasonForService:       optional(array(string())),
  reasonForServiceOther:  optional(string()),
  hesitation:             optional(array(string())),
  hesitationOther:        optional(string()),
  previousExpType:        optional(string()),
  previousSalonName:      optional(string()),
  reasonSwitchToNia:      optional(string()),
  issuesDuringUse:        optional(string()),
  changesAfterUse:        optional(string()),
  interestingNote:        requiredString("Catatan wajib diisi"),
  additionalNotes:        optional(string()),
};

const createNoteSchema = object({
  invoiceId: requiredString("Invoice wajib dipilih"),
  ...noteFields,
});

const updateNoteSchema = object({
  ...noteFields,
  // Bila dikirim tidak boleh kosong — sama dengan saat dibuat (G1-26)
  interestingNote: optional(pipe(string(), minLength(1, "Catatan wajib diisi"))),
});

module.exports = { createNoteSchema, updateNoteSchema };
