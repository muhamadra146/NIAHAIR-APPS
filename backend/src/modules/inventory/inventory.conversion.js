const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");

const D = (v) => new Prisma.Decimal(String(v));

// ── Konversi qty dokumen ke satuan dasar item ─────────────────────────
// Sama persis dengan generateSaleMovement: qty × itemUnit.conversionFactor.
// Satuan dasar item yang tidak terdaftar di item_units = faktor 1.
// Satuan lain yang tidak terdaftar → 422 (tidak lagi diam-diam dianggap faktor 1,
// karena itu membuat stok salah hitung, mis. 1 TUBE dianggap 1 GRAM).
// client = prisma atau tx (agar terbaca di dalam transaksi).
const toBaseQty = async (client, itemId, unitId, qty) => {
  const itemUnit = await client.itemUnit.findUnique({
    where:  { itemId_unitId: { itemId, unitId } },
    select: { conversionFactor: true },
  });
  if (itemUnit) return D(qty).mul(D(itemUnit.conversionFactor ?? 1));

  const item = await client.item.findUnique({
    where:  { id: itemId },
    select: { name: true, defaultUnitId: true },
  });
  if (item && item.defaultUnitId === unitId) return D(qty);

  throw new AppError(
    `Satuan tidak terdaftar untuk item "${item?.name ?? itemId}" — konversi ke satuan dasar tidak diketahui`,
    StatusCodes.UNPROCESSABLE_ENTITY,
  );
};

module.exports = { toBaseQty };
