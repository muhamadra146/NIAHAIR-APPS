'use strict';

const { object, string, number, array, pipe, integer, minLength, minValue, maxValue, optional, minSize } = require('valibot');

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

module.exports = { closePeriodSchema, reopenPeriodSchema, stockAdjustmentSchema, batchStockAdjustmentSchema };
