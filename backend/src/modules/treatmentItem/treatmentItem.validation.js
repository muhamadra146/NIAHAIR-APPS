const { object, string, pipe, number, optional, minLength, minValue } = require("valibot");

const createItemSchema = object({
  itemId: pipe(string(), minLength(1, "Item wajib dipilih")),
  unitId: pipe(string(), minLength(1, "Satuan wajib dipilih")),
  qty:    pipe(number("Jumlah harus berupa angka"), minValue(0.01, "Jumlah harus lebih dari 0")),
  notes:  optional(string()),
});

const updateItemSchema = object({
  qty:   optional(pipe(number("Jumlah harus berupa angka"), minValue(0.01, "Jumlah harus lebih dari 0"))),
  notes: optional(string()),
});

module.exports = { createItemSchema, updateItemSchema };
