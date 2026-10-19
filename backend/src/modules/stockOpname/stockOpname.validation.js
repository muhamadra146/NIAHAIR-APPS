const {
  object, string, optional, array, pipe,
  number, minValue, minLength, nullable,
} = require("valibot");

const createOpnameSchema = object({
  warehouseId: pipe(string("Harus berupa teks"), minLength(1, "warehouseId wajib diisi")),
  notes:       optional(nullable(string("Harus berupa teks"))),
});

// items: setiap item adalah StockOpnameItem.id + qtyActual
const updateItemsSchema = object({
  items: pipe(
    array(
      object({
        id:        pipe(string("Harus berupa teks"), minLength(1, "id wajib diisi")),
        qtyActual: nullable(pipe(number("Harus berupa angka"), minValue(0, "Qty tidak boleh negatif"))),
        notes:     optional(nullable(string("Harus berupa teks"))),
      })
    ),
    minLength(1, "Minimal 1 item harus dikirim")
  ),
});

// Sinkron ke Accurate: akun penyesuaian opsional (otomatis bila hanya ada satu)
const syncOpnameSchema = optional(object({
  glAccountId: optional(nullable(pipe(string("Harus berupa teks"), minLength(1, "Akun penyesuaian wajib dipilih")))),
}), {});

module.exports = { createOpnameSchema, updateItemsSchema, syncOpnameSchema };
