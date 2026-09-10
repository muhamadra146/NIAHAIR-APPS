const prisma = require("../../config/prisma");

// ── Selects ───────────────────────────────────────────────────────────────────

const INVENTORY_SELECT = {
  id:           true,
  qtyOnHand:    true,
  qtyAvailable: true,
  minStock:     true,
  item: {
    select: {
      id:       true,
      itemCode: true,
      name:     true,
      itemType: true,
      defaultUnit: { select: { id: true, name: true } },
      category:    { select: { id: true, name: true } },
    },
  },
};

const ITEM_SELECT = {
  id:                 true,
  inventoryId:        true,
  qtySystem:          true,
  qtyActual:          true,
  qtyDifference:      true,
  notes:              true,
  inventoryMovementId: true,
  createdAt:          true,
  updatedAt:          true,
  inventory:          { select: INVENTORY_SELECT },
};

const LIST_SELECT = {
  id:          true,
  opnameNo:    true,
  warehouseId: true,
  status:      true,
  notes:       true,
  postedAt:    true,
  createdAt:   true,
  updatedAt:   true,
  warehouse:   { select: { id: true, name: true } },
  createdBy:   { select: { id: true, name: true } },
  postedBy:    { select: { id: true, name: true } },
  _count:      { select: { items: true } },
};

const DETAIL_SELECT = {
  id:          true,
  opnameNo:    true,
  warehouseId: true,
  status:      true,
  notes:       true,
  postedAt:    true,
  createdAt:   true,
  updatedAt:   true,
  warehouse:   { select: { id: true, name: true } },
  createdBy:   { select: { id: true, name: true } },
  postedBy:    { select: { id: true, name: true } },
  items: {
    select:   ITEM_SELECT,
    orderBy:  { inventory: { item: { name: "asc" } } },
  },
};

// ── Repository functions ──────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.stockOpname.findMany({
    where,
    skip,
    take,
    select:  LIST_SELECT,
    orderBy: { createdAt: "desc" },
  });

const count = (where) => prisma.stockOpname.count({ where });

const findById = (id) =>
  prisma.stockOpname.findUnique({ where: { id }, select: DETAIL_SELECT });

const findMaxSeqToday = (prefix, tx = prisma) =>
  tx.stockOpname
    .findFirst({
      where:   { opnameNo: { startsWith: prefix } },
      orderBy: { opnameNo: "desc" },
      select:  { opnameNo: true },
    })
    .then((row) => {
      if (!row) return 0;
      const seq = parseInt(row.opnameNo.split("-").pop() ?? "0", 10);
      return isNaN(seq) ? 0 : seq;
    });

module.exports = { findAll, count, findById, findMaxSeqToday };
