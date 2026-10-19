const { object, array, string, number, pipe, minLength, minValue, optional, picklist, check } = require("valibot");

const transferItemSchema = object({
  itemId: pipe(string("Harus berupa teks"), minLength(1, "itemId wajib diisi")),
  qty:    pipe(number("Harus berupa angka"), minValue(0.000001, "Qty harus lebih dari 0")),
});

const createTransferSchema = object({
  sourceWarehouseId:      pipe(string("Harus berupa teks"), minLength(1, "Gudang asal wajib diisi")),
  destinationWarehouseId: pipe(string("Harus berupa teks"), minLength(1, "Gudang tujuan wajib diisi")),
  transferDate:           pipe(string("Harus berupa teks"), minLength(1, "Tanggal wajib diisi")),
  notes:                  optional(string("Harus berupa teks")),
  items:                  pipe(array(transferItemSchema), minLength(1, "Minimal 1 item harus ditambahkan")),
});

module.exports = { createTransferSchema };
