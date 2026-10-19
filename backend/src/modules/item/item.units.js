'use strict';

const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");

// ── Validasi satuan: unitId harus satuan milik item (G4-17) ─────────────────
// Satuan sah = satuan dasar, satuan beli, atau satuan yang terdaftar di item_units.
// Dipakai faktur pembelian, retur pembelian, dan produksi.
// rows: Array<{ itemId, unitId }>; client = prisma atau tx.
const assertUnitsBelongToItems = async (rows, client = prisma) => {
  const itemIds = [...new Set(rows.map((i) => i.itemId))];
  const items = await client.item.findMany({
    where:  { id: { in: itemIds } },
    select: {
      id: true, name: true, defaultUnitId: true, purchaseUnitId: true,
      itemUnits: { select: { unitId: true } },
    },
  });
  const byId = new Map(items.map((r) => [r.id, r]));
  for (const line of rows) {
    const it = byId.get(line.itemId);
    if (!it) throw new AppError("Item tidak ditemukan", StatusCodes.UNPROCESSABLE_ENTITY);
    const validUnits = new Set([it.defaultUnitId, it.purchaseUnitId, ...it.itemUnits.map((u) => u.unitId)]);
    if (!validUnits.has(line.unitId)) {
      throw new AppError(`Satuan tidak valid untuk item "${it.name}"`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
  }
};

module.exports = { assertUnitsBelongToItems };
