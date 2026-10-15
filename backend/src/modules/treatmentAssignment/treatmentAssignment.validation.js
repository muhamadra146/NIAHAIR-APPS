const { object, string, pipe, number, optional, minLength, minValue, picklist } = require("valibot");

const SLOT_KEYS = ["pemasang", "asisten", "colorist"];

const createAssignmentSchema = object({
  employeeId: pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  slotKey:    optional(picklist(SLOT_KEYS, "Slot tidak valid")),
  workQty:    optional(pipe(number("Jumlah kerja harus berupa angka"), minValue(0.01, "Jumlah kerja harus lebih dari 0"))),
  notes:      optional(string()),
});

const updateAssignmentSchema = object({
  slotKey: optional(picklist(SLOT_KEYS, "Slot tidak valid")),
  workQty: optional(pipe(number("Jumlah kerja harus berupa angka"), minValue(0.01, "Jumlah kerja harus lebih dari 0"))),
  notes:   optional(string()),
});

module.exports = { createAssignmentSchema, updateAssignmentSchema };
