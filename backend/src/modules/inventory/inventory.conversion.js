const { Prisma } = require("@prisma/client");

const D = (v) => new Prisma.Decimal(String(v));

// ── Konversi qty dokumen ke satuan dasar item ─────────────────────────
// Sama persis dengan generateSaleMovement: qty × itemUnit.conversionFactor
// (fallback 1 jika satuan tidak terdaftar di item_units).
// client = prisma atau tx (agar terbaca di dalam transaksi).
const toBaseQty = async (client, itemId, unitId, qty) => {
  const itemUnit = await client.itemUnit.findUnique({
    where:  { itemId_unitId: { itemId, unitId } },
    select: { conversionFactor: true },
  });
  const factor = itemUnit?.conversionFactor ?? 1;
  return D(qty).mul(D(factor));
};

module.exports = { toBaseQty };
