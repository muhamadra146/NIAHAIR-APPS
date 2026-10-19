const logger = require('../../utils/logger');
// ── Accurate Sync — Stock Opname ──────────────────────────────────────────────
//
// Keputusan owner 2026-10-19 (INV-014): hasil opname dikirim ke Accurate sebagai SATU
// dokumen Penyesuaian Persediaan (Item Adjustment, /item-adjustment/save.do) — jalur yang
// sama dengan penyesuaian stok manual. TIDAK membuat Perintah Stok Opname (mengunci seluruh
// gudang di Accurate) maupun Hasil Stok Opname (user API tidak berhak).
//
//   - Hanya baris yang punya movement penyesuaian (selisih ≠ 0) yang dikirim.
//   - Akun penyesuaian (glAccountId) dipilih user; bila hanya ada satu akun penyesuaian
//     aktif yang terhubung ke Accurate, akun itu dipakai otomatis.
//   - Opname tanpa selisih tidak membuat dokumen Accurate (ditandai sudah dicek).
//
// Idempotency: accurateResultId (ID dokumen penyesuaian) sudah ada → skip.
// Paralel: advisory lock per opname di dalam transaksi → sinkron kedua mendapat 409.
//
const { StatusCodes }             = require("http-status-codes");
const AppError                    = require("../../common/errors/AppError");
const prisma                      = require("../../config/prisma");
const { accurateRequest }         = require("../accurate/accurate.client");
const { getAccurateBranchId }     = require("../branch/branch.repository");
const { accurateReason, ACCURATE_ITEM_ADJUSTMENT_SAVE } = require("../inventory/inventory.adjustment.sync.service");
const { mapOpnameToItemAdjustment } = require("./stockOpname.sync.mapper");
const repo                        = require("./stockOpname.sync.repository");

// Error validasi / respon Accurate → 422 dengan pesan jelas (bukan 500) — G4-15
const fail = (message) => new AppError(message, StatusCodes.UNPROCESSABLE_ENTITY);

// ── Pilih akun penyesuaian ───────────────────────────────────────────────────
const resolveGlAccount = async (glAccountId) => {
  if (glAccountId) {
    const gl = await repo.findGlAccountById(glAccountId);
    if (!gl || !gl.isActive) throw fail("Akun penyesuaian tidak ditemukan atau tidak aktif");
    if (gl.usage !== "STOCK_ADJUSTMENT") throw fail("Akun yang dipilih bukan akun penyesuaian stok");
    if (!gl.accurateGlAccountId) throw fail("Akun penyesuaian belum tersinkron ke Accurate");
    return gl;
  }
  const accounts = await repo.findAdjustmentGlAccounts();
  if (accounts.length === 1) return accounts[0];
  if (accounts.length === 0) throw fail("Belum ada akun penyesuaian stok yang terhubung ke Accurate");
  throw fail("Pilih akun penyesuaian terlebih dahulu");
};

// ── Entry point — dipanggil dari service ─────────────────────────────────────
const syncOpnameToAccurate = async (opnameId, { glAccountId } = {}) => {
  const opname = await repo.findOpnameForSync(opnameId);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);

  if (opname.status !== "POSTED") {
    throw fail(`Opname harus berstatus POSTED sebelum sync ke Accurate, status saat ini: ${opname.status}`);
  }

  if (opname.accurateResultId) {
    logger.info(`[opname sync] sudah tersinkron adjustmentId=${opname.accurateResultId}`);
    return { skipped: true, reason: "Sudah tersinkron" };
  }

  // Baris dengan movement penyesuaian (selisih ≠ 0)
  const diffLines = opname.items.filter((it) =>
    it.inventoryMovement && Number(it.inventoryMovement.qtyChange) !== 0);

  if (diffLines.length === 0) {
    await repo.markOpnameNoDifference(opnameId);
    logger.info(`[opname sync] ${opname.opnameNo} tanpa selisih — tidak ada dokumen Accurate`);
    return { skipped: true, reason: "Tidak ada selisih stok" };
  }

  if (!opname.warehouse?.accurateWarehouseId) {
    throw fail(`Gudang "${opname.warehouse?.name}" belum terhubung ke Accurate. Hubungkan gudang terlebih dahulu.`);
  }

  const lines = [];
  for (const it of diffLines) {
    const item = it.inventory?.item;
    if (!item?.accurateItemId) {
      throw fail(`Item belum terhubung ke Accurate: ${item?.itemCode ?? it.id}. Sync item terlebih dahulu.`);
    }
    if (!item?.defaultUnit?.accurateUnitId) {
      throw fail(`Satuan item belum terhubung ke Accurate: ${item?.itemCode ?? it.id}. Sync satuan terlebih dahulu.`);
    }
    if (it.inventoryMovement.accurateAdjustmentId) {
      throw fail(`Mutasi opname ${item.itemCode} sudah tertaut ke dokumen Accurate lain — periksa data`);
    }
    lines.push({
      movement:      it.inventoryMovement,
      item,
      unitCostPrice: await repo.findCostPrice(item.id, item.defaultUnit.id),
    });
  }

  const gl = await resolveGlAccount(glAccountId);

  const accurateBranchId = opname.warehouse?.branchId
    ? await getAccurateBranchId(opname.warehouse.branchId)
    : null;

  const payload = mapOpnameToItemAdjustment(opname, lines, {
    accurateGlAccountId: gl.accurateGlAccountId,
    accurateBranchId,
  });

  return prisma.$transaction(async (tx) => {
    if (!(await repo.tryLockOpnameSync(opnameId, tx))) {
      throw new AppError("Sinkronisasi opname ini sedang berjalan", StatusCodes.CONFLICT);
    }
    // Dibaca ulang setelah lock — sinkron sebelumnya mungkin baru selesai
    if (await repo.findOpnameAccurateResultId(opnameId, tx)) {
      return { skipped: true, reason: "Sudah tersinkron" };
    }

    logger.info("[opname sync] Penyesuaian payload", JSON.stringify(payload));
    const response = await accurateRequest(ACCURATE_ITEM_ADJUSTMENT_SAVE, { method: "POST", body: payload });

    if (!response.s || !response.r?.id) {
      logger.error("[opname sync] Accurate menolak:", JSON.stringify(response));
      throw new AppError(`Accurate menolak penyesuaian opname: ${accurateReason(response)}`, StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const accurateAdjustmentId     = response.r.id;
    const accurateAdjustmentNumber = response.r.number ?? response.r.no ?? null;

    await repo.markOpnameAdjustmentSynced({
      id:          opnameId,
      accurateAdjustmentId,
      accurateAdjustmentNumber,
      movementIds: lines.map((l) => l.movement.id),
      glAccountId: gl.id,
    }, tx);

    logger.info(`[opname sync] ${opname.opnameNo} → Penyesuaian ${accurateAdjustmentNumber} (id=${accurateAdjustmentId})`);
    return { accurateAdjustmentId, accurateAdjustmentNumber, lineCount: lines.length };
  }, { timeout: 60000, maxWait: 10000 });
};

module.exports = { syncOpnameToAccurate };
