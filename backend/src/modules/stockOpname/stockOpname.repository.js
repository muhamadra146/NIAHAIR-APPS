const prisma               = require("../../config/prisma");
const { findSyncStatusBatch, findSyncStatus } = require("./stockOpname.sync.repository");

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

// ── Augment list rows dengan sync status (raw query — 1 extra round-trip) ─────
const findAll = async ({ skip, take, where }) => {
  const rows = await prisma.stockOpname.findMany({
    where,
    skip,
    take,
    select:  LIST_SELECT,
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return rows;

  try {
    const syncMap = await findSyncStatusBatch(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, ...(syncMap[r.id] ?? {}) }));
  } catch (err) {
    // Sync status gagal → tetap kembalikan rows tanpa field Accurate (non-fatal)
    console.error("[stockOpname.repository] findSyncStatusBatch error:", err.message);
    return rows;
  }
};

const count = (where) => prisma.stockOpname.count({ where });

// ── Augment single row dengan Accurate sync fields ────────────────────────────
const findById = async (id) => {
  const opname = await prisma.stockOpname.findUnique({ where: { id }, select: DETAIL_SELECT });
  if (!opname) return null;
  try {
    const syncFields = await findSyncStatus(id);
    return { ...opname, ...syncFields };
  } catch (err) {
    console.error("[stockOpname.repository] findSyncStatus error:", err.message);
    return opname;
  }
};

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
