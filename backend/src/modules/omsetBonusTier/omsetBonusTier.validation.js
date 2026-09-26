const {
  object, number, pipe, minValue, maxValue, integer, optional,
} = require("valibot");

const createSchema = object({
  minimumOmset: pipe(number(), minValue(0, "Minimum omset tidak boleh negatif")),
  percentage:   pipe(number(), minValue(0.01, "Persentase minimal 0.01"), maxValue(100, "Persentase maksimal 100")),
  sortOrder:    optional(pipe(number(), integer("Urutan harus bilangan bulat"), minValue(0))),
});

const updateSchema = object({
  minimumOmset: optional(pipe(number(), minValue(0))),
  percentage:   optional(pipe(number(), minValue(0.01), maxValue(100))),
  sortOrder:    optional(pipe(number(), integer(), minValue(0))),
});

module.exports = { createSchema, updateSchema };
