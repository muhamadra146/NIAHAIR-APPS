// ── Sync repository — pakai raw SQL untuk field Accurate baru ────────────────
//
// Prisma client belum di-regenerate (DLL terkunci oleh server yang berjalan)
// sehingga field accurateOrderId / accurateResultId belum dikenal oleh
// generated client. Raw queries bypass batasan ini — data tetap ada di DB.
const prisma = require("../../config/prisma");

// ── Read — ambil opname lengkap untuk keperluan sync ─────────────────────────
const findOpnameForSync = async (id) => {
  // Data utama via Prisma (field lama yang sudah dikenal client)
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    select: {
      id:        true,
      opnameNo:  true,
      status:    true,
      createdAt: true,
      postedAt:  true,
      warehouse: {
        select: {
          id:                  true,
          name:                true,
          branchId:            true,
          accurateWarehouseId: true,
        },
      },
      items: {
        select: {
          id:            true,
          qtySystem:     true,
          qtyActual:     true,
          qtyDifference: true,
          inventoryMovement: {
            select: { id: true, qtyChange: true, accurateAdjustmentId: true },
          },
          inventory: {
            select: {
              id:   true,
              item: {
                select: {
                  id:             true,
                  name:           true,
                  itemCode:       true,
                  itemType:       true,
                  accurateItemId: true,
                  defaultUnit: {
                    select: { id: true, name: true, accurateUnitId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!opname) return null;

  // Field Accurate sync via raw query (belum ada di Prisma client)
  const [syncRow] = await prisma.$queryRawUnsafe(
    `SELECT "accurateOrderId", "accurateResultId", "accurateResultNumber", "lastSyncAt"
     FROM   "stock_opnames"
     WHERE  id = $1`,
    id,
  );

  return { ...opname, ...(syncRow ?? {}) };
};

// ── Write — simpan Penyesuaian Persediaan hasil opname (keputusan owner 2026-10-19) ──
// Kolom accurateResultId/Number dipakai untuk ID/nomor dokumen Penyesuaian Persediaan
// (tanpa perubahan skema); setiap movement opname ditautkan ke dokumen yang sama.
const markOpnameAdjustmentSynced = async ({ id, accurateAdjustmentId, accurateAdjustmentNumber, movementIds, glAccountId }, client = prisma) => {
  await client.$executeRawUnsafe(
      `UPDATE "stock_opnames"
       SET    "accurateResultId"     = $1,
              "accurateResultNumber" = $2,
              "lastSyncAt"           = (NOW() AT TIME ZONE 'UTC')
       WHERE  id = $3`,
      accurateAdjustmentId,
      accurateAdjustmentNumber ?? null,
      id,
  );
  await client.inventoryMovement.updateMany({
    where: { id: { in: movementIds } },
    data:  { accurateAdjustmentId, glAccountId },
  });
};

// ── Lock — cegah dua sinkron paralel membuat dua dokumen Accurate ───────────
// Advisory lock transaksi (lepas otomatis saat transaksi selesai). false = sedang dipakai.
const tryLockOpnameSync = async (id, client) => {
  const [row] = await client.$queryRawUnsafe(
    `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked`,
    `stock_opname_sync:${id}`,
  );
  return row?.locked === true;
};

// ── Read — ID dokumen Accurate terkini (dibaca ulang setelah lock) ────────────
const findOpnameAccurateResultId = async (id, client = prisma) => {
  const [row] = await client.$queryRawUnsafe(
    `SELECT "accurateResultId" FROM "stock_opnames" WHERE id = $1`,
    id,
  );
  return row?.accurateResultId ?? null;
};

// ── Write — opname tanpa selisih: tidak ada dokumen Accurate, cukup tandai sudah dicek ──
const markOpnameNoDifference = (id, client = prisma) =>
  client.$executeRawUnsafe(
    `UPDATE "stock_opnames" SET "lastSyncAt" = (NOW() AT TIME ZONE 'UTC') WHERE id = $1`,
    id,
  );

// ── Read — akun penyesuaian aktif yang sudah terhubung ke Accurate ───────────
const findAdjustmentGlAccounts = () =>
  prisma.glAccount.findMany({
    where:  { usage: "STOCK_ADJUSTMENT", isActive: true, accurateGlAccountId: { not: null } },
    select: { id: true, number: true, name: true, accurateGlAccountId: true },
  });

const findGlAccountById = (id) =>
  prisma.glAccount.findUnique({
    where:  { id },
    select: { id: true, number: true, name: true, usage: true, isActive: true, accurateGlAccountId: true },
  });

// ── Read — harga pokok terakhir per item (satuan dasar), sama dengan penyesuaian manual ──
const findCostPrice = async (itemId, unitId) => {
  const row = await prisma.itemPrice.findFirst({
    where:   { itemId, unitId, isActive: true },
    orderBy: { effectiveDate: "desc" },
    select:  { costPrice: true },
  });
  return row?.costPrice ? Number(row.costPrice) : 0;
};

// ── Read — ambil sync status ringkas (untuk badge di list/detail) ─────────────
const findSyncStatus = async (id) => {
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT "accurateOrderId",    "accurateOrderNumber",
            "accurateResultId",   "accurateResultNumber",
            "lastSyncAt"
     FROM   "stock_opnames"
     WHERE  id = $1`,
    id,
  );
  return row ?? {};
};

// ── Read — ambil sync status untuk banyak opname sekaligus (for list view) ───
//
// Gunakan individual placeholders ($1, $2, ...) dan spread array,
// karena Prisma $queryRawUnsafe tidak bisa serialize JS array sebagai
// PostgreSQL uuid[] dengan ANY($1::uuid[]).
const findSyncStatusBatch = async (ids) => {
  if (!ids.length) return {};
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id::text,
            "accurateResultId",
            "lastSyncAt"
     FROM   "stock_opnames"
     WHERE  id::text IN (${placeholders})`,
    ...ids,
  );
  return Object.fromEntries(rows.map((r) => [r.id, r]));
};

module.exports = {
  findOpnameForSync,
  markOpnameAdjustmentSynced,
  markOpnameNoDifference,
  tryLockOpnameSync,
  findOpnameAccurateResultId,
  findAdjustmentGlAccounts,
  findGlAccountById,
  findCostPrice,
  findSyncStatus,
  findSyncStatusBatch,
};
