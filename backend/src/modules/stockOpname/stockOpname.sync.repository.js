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
    `SELECT "accurateOrderId", "accurateResultId"
     FROM   "stock_opnames"
     WHERE  id = $1`,
    id,
  );

  return { ...opname, ...(syncRow ?? {}) };
};

// ── Write — simpan ID Perintah Stok Opname setelah berhasil sync ─────────────
const markOpnameOrderSynced = ({ id, accurateOrderId, accurateOrderNumber }) =>
  prisma.$executeRawUnsafe(
    `UPDATE "stock_opnames"
     SET    "accurateOrderId"     = $1,
            "accurateOrderNumber" = $2,
            "lastSyncAt"          = NOW()
     WHERE  id = $3`,
    accurateOrderId,
    accurateOrderNumber ?? null,
    id,
  );

// ── Write — simpan ID Hasil Stok Opname setelah berhasil sync ────────────────
const markOpnameResultSynced = ({ id, accurateResultId, accurateResultNumber }) =>
  prisma.$executeRawUnsafe(
    `UPDATE "stock_opnames"
     SET    "accurateResultId"     = $1,
            "accurateResultNumber" = $2,
            "lastSyncAt"           = NOW()
     WHERE  id = $3`,
    accurateResultId,
    accurateResultNumber ?? null,
    id,
  );

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
  markOpnameOrderSynced,
  markOpnameResultSynced,
  findSyncStatus,
  findSyncStatusBatch,
};
