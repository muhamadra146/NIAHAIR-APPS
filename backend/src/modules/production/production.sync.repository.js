// ── Sync repository — pakai raw SQL untuk field Accurate baru ────────────────
//
// Prisma client belum di-regenerate (field accurate_* belum dikenal client).
// Raw queries bypass batasan ini — data tetap ada di DB.
const prisma = require("../../config/prisma");

// ── Read — ambil production order lengkap untuk keperluan sync ────────────────
//
// Mengambil data utama via Prisma (field lama yang sudah dikenal client),
// lalu menambahkan field Accurate via raw query.
const findProductionForSync = async (id) => {
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    select: {
      id:            true,
      productionNo:  true,
      status:        true,
      productionDate: true,
      actualStartAt:  true,
      actualFinishAt: true,
      branchId:       true,
      warehouseId:    true,
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
          id:               true,
          plannedQuantity:  true,
          producedQuantity: true,
          item: {
            select: {
              id:             true,
              name:           true,
              itemCode:       true,
              accurateItemId: true,
            },
          },
          unit: {
            select: { id: true, name: true, accurateUnitId: true },
          },
        },
      },
      materials: {
        select: {
          id:              true,
          plannedQuantity: true,
          actualQuantity:  true,
          item: {
            select: {
              id:             true,
              name:           true,
              itemCode:       true,
              accurateItemId: true,
            },
          },
          unit: {
            select: { id: true, name: true, accurateUnitId: true },
          },
          warehouse: {
            select: {
              id:                  true,
              name:                true,
              accurateWarehouseId: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  // Field Accurate sync via raw query (belum ada di Prisma client)
  const [syncRow] = await prisma.$queryRawUnsafe(
    `SELECT "accurate_pekerjaan_id"        AS "accuratePekerjaanId",
            "accurate_pekerjaan_number"    AS "accuratePekerjaanNumber",
            "accurate_penyelesaian_id"     AS "accuratePenyelesaianId",
            "accurate_penyelesaian_number" AS "accuratePenyelesaianNumber",
            "last_sync_at"                 AS "lastSyncAt"
     FROM   "production_orders"
     WHERE  id = $1`,
    id,
  );

  return { ...order, ...(syncRow ?? {}) };
};

// ── Write — simpan ID Pekerjaan Pesanan setelah berhasil sync ─────────────────
const markPekerjaanSynced = ({ id, accuratePekerjaanId, accuratePekerjaanNumber }) =>
  prisma.$executeRawUnsafe(
    `UPDATE "production_orders"
     SET    "accurate_pekerjaan_id"     = $1,
            "accurate_pekerjaan_number" = $2,
            "last_sync_at"              = NOW()
     WHERE  id = $3`,
    accuratePekerjaanId,
    accuratePekerjaanNumber ?? null,
    id,
  );

// ── Write — simpan ID Penyelesaian Pesanan setelah berhasil sync ──────────────
const markPenyelesaianSynced = ({ id, accuratePenyelesaianId, accuratePenyelesaianNumber }) =>
  prisma.$executeRawUnsafe(
    `UPDATE "production_orders"
     SET    "accurate_penyelesaian_id"     = $1,
            "accurate_penyelesaian_number" = $2,
            "last_sync_at"                 = NOW()
     WHERE  id = $3`,
    accuratePenyelesaianId,
    accuratePenyelesaianNumber ?? null,
    id,
  );

// ── Read — ambil sync status ringkas (untuk badge di detail page) ─────────────
const findSyncStatus = async (id) => {
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT "accurate_pekerjaan_id"        AS "accuratePekerjaanId",
            "accurate_pekerjaan_number"    AS "accuratePekerjaanNumber",
            "accurate_penyelesaian_id"     AS "accuratePenyelesaianId",
            "accurate_penyelesaian_number" AS "accuratePenyelesaianNumber",
            "last_sync_at"                 AS "lastSyncAt"
     FROM   "production_orders"
     WHERE  id = $1`,
    id,
  );
  return row ?? {};
};

module.exports = {
  findProductionForSync,
  markPekerjaanSynced,
  markPenyelesaianSynced,
  findSyncStatus,
};
