const {
  object, string, number, array, optional, pipe, minLength, minValue, maxValue,
  picklist,
} = require("valibot");

const productionItemSchema = object({
  itemId:                   pipe(string("Harus berupa teks"), minLength(1, "itemId wajib diisi")),
  unitId:                   pipe(string("Harus berupa teks"), minLength(1, "unitId wajib diisi")),
  plannedQuantity:          pipe(number("Harus berupa angka"), minValue(0.001, "Quantity minimal 0.001")),
  // Porsi alokasi biaya untuk Penyelesaian Pesanan Accurate.
  // Frontend mengirim nilai yang sudah terdistribusi. Default 100 (single-item).
  costAllocationPercentage: optional(pipe(number("Harus berupa angka"), minValue(0.01, "Minimal 0.01%"), maxValue(100, "Maksimal 100%"))),
});

const productionMaterialSchema = object({
  itemId:          pipe(string("Harus berupa teks"), minLength(1, "itemId wajib diisi")),
  unitId:          pipe(string("Harus berupa teks"), minLength(1, "unitId wajib diisi")),
  plannedQuantity: pipe(number("Harus berupa angka"), minValue(0.001, "Quantity minimal 0.001")),
  warehouseId:     optional(pipe(string("Harus berupa teks"), minLength(1, "Wajib diisi"))),
});

const productionEmployeeSchema = object({
  employeeId:   pipe(string("Harus berupa teks"), minLength(1, "employeeId wajib diisi")),
  role:         optional(picklist(["OPERATOR", "SUPERVISOR", "QC"])),
  workingHours: optional(pipe(number("Harus berupa angka"), minValue(0, "Tidak boleh negatif"))),
  notes:        optional(string("Harus berupa teks")),
});

const createProductionSchema = object({
  branchId:        pipe(string("Harus berupa teks"), minLength(1, "branchId wajib diisi")),
  warehouseId:     pipe(string("Harus berupa teks"), minLength(1, "warehouseId wajib diisi")),
  productionDate:  pipe(string("Harus berupa teks"), minLength(1, "productionDate wajib diisi")),
  plannedStartAt:  optional(string("Harus berupa teks")),
  plannedFinishAt: optional(string("Harus berupa teks")),
  notes:           optional(string("Harus berupa teks")),
  items:           array(productionItemSchema),
  materials:       array(productionMaterialSchema),
  employees:       optional(array(productionEmployeeSchema)),
});

const updateStatusSchema = object({
  status: picklist(
    ["RELEASED", "IN_PROGRESS", "QC", "COMPLETED", "CANCELLED"],
    "Status tidak valid",
  ),
});

const submitQCSchema = object({
  status:         picklist(["PASS", "REWORK", "REJECT"], "Status QC tidak valid"),
  notes:          optional(string("Harus berupa teks")),
  inspectionDate: optional(string("Harus berupa teks")),
});

module.exports = { createProductionSchema, updateStatusSchema, submitQCSchema };
