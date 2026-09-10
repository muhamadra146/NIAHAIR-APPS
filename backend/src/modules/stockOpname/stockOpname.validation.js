const {
  object, string, optional, array, pipe,
  number, minValue, minLength, nullable,
} = require("valibot");

const createOpnameSchema = object({
  warehouseId: pipe(string(), minLength(1, "warehouseId wajib diisi")),
  notes:       optional(nullable(string())),
});

// items: setiap item adalah StockOpnameItem.id + qtyActual
const updateItemsSchema = object({
  items: pipe(
    array(
      object({
        id:        pipe(string(), minLength(1, "id wajib diisi")),
        qtyActual: nullable(pipe(number(), minValue(0, "Qty tidak boleh negatif"))),
        notes:     optional(nullable(string())),
      })
    ),
    minLength(1, "Minimal 1 item harus dikirim")
  ),
});

module.exports = { createOpnameSchema, updateItemsSchema };
