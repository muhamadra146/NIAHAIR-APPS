const {
  object,
  string,
  pipe,
  optional,
  nullable,
  minLength,
  maxLength,
  regex,
  boolean,
  number,
  minValue,
  maxValue,
  picklist,
} = require("valibot");

// slotKey: hanya huruf kecil, angka, underscore
const slotKeySchema = pipe(
  string(),
  minLength(1, "Slot key is required"),
  maxLength(50, "Slot key max 50 characters"),
  regex(/^[a-z0-9_]+$/, "Slot key hanya boleh huruf kecil, angka, dan underscore")
);

const commissionModeSchema = picklist(
  ["FIXED_RATE", "WORK_QTY"],
  "commissionMode harus FIXED_RATE atau WORK_QTY"
);

const slotTypeSchema = picklist(
  ["PERCENTAGE", "FLAT"],
  "slotType harus PERCENTAGE atau FLAT"
);

const createJobSlotSchema = object({
  slotKey:        slotKeySchema,
  label:          pipe(string(), minLength(1, "Label is required"), maxLength(100, "Label max 100 characters")),
  commissionRate: pipe(number("Commission rate must be a number"), minValue(0, "Rate tidak boleh negatif"), maxValue(100, "Rate maksimal 100%")),
  commissionMode: optional(commissionModeSchema),   // default FIXED_RATE di DB
  // Role-based fields (opsional — null = slot lama, backward compat)
  roleId:         optional(nullable(pipe(string(), minLength(1)))),
  isMainJob:      optional(boolean()),
  slotType:       optional(slotTypeSchema),
  isRequired:     optional(boolean()),
  sortOrder:      optional(pipe(number(), minValue(0))),
});

const updateJobSlotSchema = object({
  slotKey:        optional(slotKeySchema),
  label:          optional(pipe(string(), minLength(1, "Label cannot be empty"), maxLength(100))),
  commissionRate: optional(pipe(number("Commission rate must be a number"), minValue(0), maxValue(100))),
  commissionMode: optional(commissionModeSchema),
  // Role-based fields
  roleId:         optional(nullable(pipe(string(), minLength(1)))),
  isMainJob:      optional(boolean()),
  slotType:       optional(slotTypeSchema),
  isRequired:     optional(boolean()),
  sortOrder:      optional(pipe(number(), minValue(0))),
  isActive:       optional(boolean()),
});

module.exports = { createJobSlotSchema, updateJobSlotSchema };
