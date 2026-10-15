const { object, string, pipe, number, minLength, integer } = require("valibot");

const updateBranchMappingSchema = object({
  branchId: pipe(string(), minLength(1, "Cabang wajib dipilih")),
});

const updateAccurateMappingSchema = object({
  accurateWarehouseId: pipe(number(), integer("ID gudang Accurate harus bilangan bulat")),
});

module.exports = { updateBranchMappingSchema, updateAccurateMappingSchema };
