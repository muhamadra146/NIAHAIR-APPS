const prisma = require("../../config/prisma");

const INCLUDE = {
  category:           { select: { id: true, name: true } },
  defaultUnit:        { select: { id: true, name: true } },
  commissionCategory: { select: { id: true, code: true, name: true } },
  itemUnits: {
    select: {
      id:               true,
      conversionFactor: true,
      isDefault:        true,
      unit:             { select: { id: true, name: true } },
    },
  },
  itemPrices: {
    where:  { isActive: true },
    select: {
      id:            true,
      unitId:        true,
      branchId:      true,
      sellingPrice:  true,
      costPrice:     true,
      effectiveDate: true,
    },
  },
};

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.item.findMany({
    skip, take, where,
    orderBy: orderBy ?? { createdAt: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.item.count({ where });

const findById = (id) =>
  prisma.item.findUnique({ where: { id }, include: INCLUDE });

const findByItemCode = (itemCode) =>
  prisma.item.findUnique({ where: { itemCode } });

const findCommissionCategoryById = (id) =>
  prisma.commissionCategory.findUnique({ where: { id }, select: { id: true } });

const create = (data) => prisma.item.create({ data });

const update = (id, data) => prisma.item.update({ where: { id }, data, include: INCLUDE });

const findServiceMaterials = (serviceItemId) =>
  prisma.serviceMaterial.findMany({
    where: { serviceItemId, isActive: true },
    include: {
      materialItem: {
        select: {
          id: true, name: true, itemCode: true, itemType: true,
          category:    { select: { id: true, name: true } },
          defaultUnit: { select: { id: true, name: true } },
          itemUnits:   { select: { unitId: true, conversionFactor: true } },
        },
      },
      unit: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

module.exports = { findAll, count, findById, findByItemCode, findCommissionCategoryById, create, update, findServiceMaterials };
