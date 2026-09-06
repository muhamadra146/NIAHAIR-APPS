const {
  object, string, number, array, optional, pipe, minLength, minValue,
  picklist,
} = require("valibot");

const productionItemSchema = object({
  itemId:          pipe(string(), minLength(1, "itemId wajib diisi")),
  unitId:          pipe(string(), minLength(1, "unitId wajib diisi")),
  plannedQuantity: pipe(number(), minValue(0.001, "Quantity minimal 0.001")),
});

const productionMaterialSchema = object({
  itemId:          pipe(string(), minLength(1, "itemId wajib diisi")),
  unitId:          pipe(string(), minLength(1, "unitId wajib diisi")),
  plannedQuantity: pipe(number(), minValue(0.001, "Quantity minimal 0.001")),
  warehouseId:     optional(pipe(string(), minLength(1))),
});

const productionEmployeeSchema = object({
  employeeId:   pipe(string(), minLength(1, "employeeId wajib diisi")),
  role:         optional(picklist(["OPERATOR", "SUPERVISOR", "QC"])),
  workingHours: optional(pipe(number(), minValue(0))),
  notes:        optional(string()),
});

const createProductionSchema = object({
  branchId:        pipe(string(), minLength(1, "branchId wajib diisi")),
  warehouseId:     pipe(string(), minLength(1, "warehouseId wajib diisi")),
  productionDate:  pipe(string(), minLength(1, "productionDate wajib diisi")),
  plannedStartAt:  optional(string()),
  plannedFinishAt: optional(string()),
  notes:           optional(string()),
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
  notes:          optional(string()),
  inspectionDate: optional(string()),
});

module.exports = { createProductionSchema, updateStatusSchema, submitQCSchema };
