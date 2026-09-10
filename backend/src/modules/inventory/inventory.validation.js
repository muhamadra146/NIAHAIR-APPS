'use strict';

const { object, string, number, array, pipe, integer, minLength, minValue, maxValue, optional, minSize, nullable } = require('valibot');

const closePeriodSchema = object({
  year:  pipe(number(), integer(), minValue(2020)),
  month: pipe(number(), integer(), minValue(1), maxValue(12)),
});

const reopenPeriodSchema = object({
  year:  pipe(number(), integer(), minValue(2020)),
  month: pipe(number(), integer(), minValue(1), maxValue(12)),
});

const stockAdjustmentSchema = object({
  qtyActual:   pipe(number(), minValue(0, "Qty aktual tidak boleh negatif")),
  reason:      pipe(string(), minLength(1, "Alasan wajib diisi")),
  glAccountId: pipe(string(), minLength(1, "Akun penyesuaian wajib dipilih")),
  notes:       optional(string()),
});

const batchStockAdjustmentSchema = object({
  glAccountId: pipe(string(), minLength(1, "Akun penyesuaian wajib dipilih")),
  reason:      pipe(string(), minLength(1, "Alasan wajib diisi")),
  notes:       optional(string()),
  items:       pipe(
    array(object({
      inventoryId: pipe(string(), minLength(1)),
      qtyActual:   pipe(number(), minValue(0, "Qty aktual tidak boleh negatif")),
    })),
    minSize(1, "Minimal 1 item harus ditambahkan")
  ),
});

// GAP 2 — Opening Balance
const openingBalanceSchema = object({
  warehouseId: pipe(string(), minLength(1, "warehouseId wajib diisi")),
  notes:       optional(nullable(string())),
  items: pipe(
    array(object({
      itemId:   pipe(string(), minLength(1, "itemId wajib diisi")),
      qty:      pipe(number(), minValue(0, "Qty tidak boleh negatif")),
      unitCost: optional(nullable(pipe(number(), minValue(0)))),
    })),
    minSize(1, "Minimal 1 item harus diisi")
  ),
});

// GAP 3 — Update minStock
const updateMinStockSchema = object({
  minStock: nullable(pipe(number(), minValue(0, "Min stok tidak boleh negatif"))),
});

module.exports = {
  closePeriodSchema,
  reopenPeriodSchema,
  stockAdjustmentSchema,
  batchStockAdjustmentSchema,
  openingBalanceSchema,
  updateMinStockSchema,
};
