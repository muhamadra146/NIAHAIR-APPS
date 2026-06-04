const { object, string, pipe, number, optional, minLength, minValue } = require("valibot");

const createItemSchema = object({
  itemId: pipe(string(), minLength(1, "itemId is required")),
  unitId: pipe(string(), minLength(1, "unitId is required")),
  qty:    pipe(number("qty must be a number"), minValue(0.01, "qty must be greater than 0")),
  notes:  optional(string()),
});

const updateItemSchema = object({
  qty:   optional(pipe(number("qty must be a number"), minValue(0.01, "qty must be greater than 0"))),
  notes: optional(string()),
});

module.exports = { createItemSchema, updateItemSchema };
