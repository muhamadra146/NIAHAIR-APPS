const { object, string, pipe, minLength, optional, number } = require("valibot");

const checkInSchema = object({
  staffScheduleId: pipe(string(), minLength(1, "staffScheduleId is required")),
  latitude:        optional(number()),
  longitude:       optional(number()),
  photoUrl:        optional(string()),
  notes:           optional(string()),
});

const checkOutSchema = object({
  staffScheduleId: pipe(string(), minLength(1, "staffScheduleId is required")),
  latitude:        optional(number()),
  longitude:       optional(number()),
  photoUrl:        optional(string()),
  notes:           optional(string()),
});

const manualSetSchema = object({
  staffScheduleId: pipe(string(), minLength(1, "staffScheduleId is required")),
  status:          optional(string()),
  checkInAt:       optional(string()),
  checkOutAt:      optional(string()),
  notes:           optional(string()),
});

module.exports = { checkInSchema, checkOutSchema, manualSetSchema };
