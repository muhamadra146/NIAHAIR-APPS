const { object, string, pipe, optional, nullable, picklist, minLength, boolean } = require("valibot");

const createItemSchema = object({
  itemCode: pipe(string(), minLength(1, "Kode item wajib diisi")),
  name: pipe(string(), minLength(1, "Nama wajib diisi")),
  itemType: picklist(["INVENTORY", "SERVICE"], "Tipe item harus barang atau jasa"),
  categoryId: optional(string()),
  defaultUnitId: optional(string()),
});

const updateItemSchema = object({
  itemCode:             optional(pipe(string(), minLength(1, "Kode item tidak boleh kosong"))),
  name:                 optional(pipe(string(), minLength(1, "Nama tidak boleh kosong"))),
  itemType:             optional(picklist(["INVENTORY", "SERVICE"], "Tipe item harus barang atau jasa")),
  categoryId:           optional(string()),
  defaultUnitId:        optional(string()),
  commissionCategoryId: optional(nullable(string())),
  isActive:             optional(boolean()),
  // true = item tidak pernah kena diskon membership
  excludeMemberDiscount: optional(boolean()),
});

module.exports = { createItemSchema, updateItemSchema };
