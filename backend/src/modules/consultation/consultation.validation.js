const { object, string, array, optional, pipe, minLength } = require("valibot");

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
  interestingNote:        pipe(string(), minLength(1, "interestingNote is required")),
  additionalNotes:        optional(string()),
};

const createNoteSchema = object({
  invoiceId: pipe(string(), minLength(1, "invoiceId is required")),
  ...noteFields,
});

const updateNoteSchema = object({
  ...noteFields,
  interestingNote: optional(string()),
});

module.exports = { createNoteSchema, updateNoteSchema };
