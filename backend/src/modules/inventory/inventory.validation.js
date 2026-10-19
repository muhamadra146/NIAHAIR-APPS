'use strict';

const { object, string, number, array, pipe, integer, minLength, minValue, maxValue, optional, nullable } = require('valibot');

const closePeriodSchema = object({
  year:  pipe(number("Harus berupa angka"), integer("Harus bilangan bulat"), minValue(2020, "Tahun tidak valid")),
  month: pipe(number("Harus berupa angka"), integer("Harus bilangan bulat"), minValue(1, "Bulan tidak valid"), maxValue(12, "Bulan tidak valid")),
});

const reopenPeriodSchema = object({
  year:  pipe(number("Harus berupa angka"), integer("Harus bilangan bulat"), minValue(2020, "Tahun tidak valid")),
  month: pipe(number("Harus berupa angka"), integer("Harus bilangan bulat"), minValue(1, "Bulan tidak valid"), maxValue(12, "Bulan tidak valid")),
});

const stockAdjustmentSchema = object({
  qtyActual:   pipe(number("Harus berupa angka"), minValue(0, "Qty aktual tidak boleh negatif")),
  reason:      pipe(string("Harus berupa teks"), minLength(1, "Alasan wajib diisi")),
  glAccountId: pipe(string("Harus berupa teks"), minLength(1, "Akun penyesuaian wajib dipilih")),
  notes:       optional(string("Harus berupa teks")),
});

const batchStockAdjustmentSchema = object({
  glAccountId: pipe(string("Harus berupa teks"), minLength(1, "Akun penyesuaian wajib dipilih")),
  reason:      pipe(string("Harus berupa teks"), minLength(1, "Alasan wajib diisi")),
  notes:       optional(string("Harus berupa teks")),
  items:       pipe(
    array(object({
      inventoryId: pipe(string("Harus berupa teks"), minLength(1, "Wajib diisi")),
      qtyActual:   pipe(number("Harus berupa angka"), minValue(0, "Qty aktual tidak boleh negatif")),
    })),
    minLength(1, "Minimal 1 item harus ditambahkan")
  ),
});

// GAP 2 — Opening Balance
const openingBalanceSchema = object({
  warehouseId: pipe(string("Harus berupa teks"), minLength(1, "warehouseId wajib diisi")),
  notes:       optional(nullable(string("Harus berupa teks"))),
  items: pipe(
    array(object({
      itemId:   pipe(string("Harus berupa teks"), minLength(1, "itemId wajib diisi")),
      qty:      pipe(number("Harus berupa angka"), minValue(0, "Qty tidak boleh negatif")),
      unitCost: optional(nullable(pipe(number("Harus berupa angka"), minValue(0, "Tidak boleh negatif")))),
    })),
    minLength(1, "Minimal 1 item harus diisi")
  ),
});

// GAP 3 — Update minStock
const updateMinStockSchema = object({
  minStock: nullable(pipe(number("Harus berupa angka"), minValue(0, "Min stok tidak boleh negatif"))),
});

module.exports = {
  closePeriodSchema,
  reopenPeriodSchema,
  stockAdjustmentSchema,
  batchStockAdjustmentSchema,
  openingBalanceSchema,
  updateMinStockSchema,
};
