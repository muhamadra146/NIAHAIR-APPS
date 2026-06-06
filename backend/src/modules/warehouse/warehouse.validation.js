const { object, string, pipe, number, minLength, integer } = require("valibot");

const updateBranchMappingSchema = object({
  branchId: pipe(string(), minLength(1, "branchId is required")),
});

const updateAccurateMappingSchema = object({
  accurateWarehouseId: pipe(number(), integer("accurateWarehouseId must be an integer")),
});

module.exports = { updateBranchMappingSchema, updateAccurateMappingSchema };
