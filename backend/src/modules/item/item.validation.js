const { object, string, pipe, optional, nullable, picklist, minLength, boolean } = require("valibot");

const createItemSchema = object({
  itemCode: pipe(string(), minLength(1, "Item code is required")),
  name: pipe(string(), minLength(1, "Name is required")),
  itemType: picklist(["INVENTORY", "SERVICE"], "Item type must be INVENTORY or SERVICE"),
  categoryId: optional(string()),
  defaultUnitId: optional(string()),
});

const updateItemSchema = object({
  itemCode:             optional(pipe(string(), minLength(1, "Item code cannot be empty"))),
  name:                 optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  itemType:             optional(picklist(["INVENTORY", "SERVICE"], "Item type must be INVENTORY or SERVICE")),
  categoryId:           optional(string()),
  defaultUnitId:        optional(string()),
  commissionCategoryId: optional(nullable(string())),
  isActive:             optional(boolean()),
});

module.exports = { createItemSchema, updateItemSchema };
