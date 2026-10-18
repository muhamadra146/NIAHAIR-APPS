const { Prisma }      = require("@prisma/client");
const { dailyPrefix, nextDailyNumber } = require("../../utils/dailyNumber");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const cloudinary      = require("../../config/cloudinary");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { wibDayStart, wibDayEnd, wibDateStr } = require("../../utils/date");
const prisma                                                       = require("../../config/prisma");
const { createSyncJob }                                            = require("../syncQueue/syncQueue.service");
const { deleteDepositPaymentFromAccurate }                         = require("./depositPayment.sync.service");
const {
  findAll,
  count,
  findById,
  findByDepositId,
  findLastNumber,
  findDepositForPayment,
  findPaymentMethodById,
  create,
  markDepositPaid,
  removeDepositPayment,
  revertDepositToUnpaid,
} = require("./depositPayment.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── Payment number generator: DPAY-YYYYMMDD-XXXX ─────────────────────

const buildPaymentNo = async () => {
  // Nomor terbesar hari ini + 1 (bukan jumlah + 1 — bentrok setelah ada yang dihapus)
  const prefix = dailyPrefix("DPAY");
  return nextDailyNumber(prefix, await findLastNumber(prefix));
};

// ── List ──────────────────────────────────────────────────────────────

const listDepositPayments = async ({ page, limit, depositId, paymentMethodId, branchId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (depositId)       where.depositId       = depositId;
  if (paymentMethodId) where.paymentMethodId = paymentMethodId;
  if (branchId)        where.deposit          = { branchId };
  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = wibDayStart(startDate);
    if (endDate)   where.paidAt.lte = wibDayEnd(endDate);
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────

const getDepositPaymentById = async (id) => {
  const dp = await findById(id);
  if (!dp) throw new AppError("Pembayaran deposit tidak ditemukan", StatusCodes.NOT_FOUND);
  return dp;
};

const getPaymentsByDeposit = async (depositId) => findByDepositId(depositId);

// ── Create ────────────────────────────────────────────────────────────

const createDepositPayment = async ({ depositId, paymentMethodId, paidAt: paidAtInput, referenceNo, notes, transferProofUrl, transferProofPublicId }) => {
  const deposit = await findDepositForPayment(depositId);
  if (!deposit) throw new AppError("Deposit tidak ditemukan", StatusCodes.NOT_FOUND);

  // Only UNPAID deposits can receive a payment
  const blocked = ["PAID", "PARTIAL_USED", "USED", "CANCELLED", "REFUNDED"];
  if (blocked.includes(deposit.status)) {
    throw new AppError(
      `Cannot pay deposit with status ${deposit.status}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const paymentMethod = await findPaymentMethodById(paymentMethodId);
  if (!paymentMethod) throw new AppError("Metode pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!paymentMethod.isActive) {
    throw new AppError("Metode pembayaran tidak aktif", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const paidAt = paidAtInput ? new Date(paidAtInput) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    throw new AppError("Format tanggal bayar tidak valid", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Tanggal bayar tidak boleh sebelum tanggal deposit (= tanggal Faktur DP di Accurate);
  // Accurate menolak "Tanggal Penerimaan Penjualan mendahului Tanggal Faktur". Bandingkan kalender WIB.
  const depositDate = deposit.paidAt ?? deposit.createdAt;
  if (depositDate && wibDateStr(paidAt) < wibDateStr(depositDate)) {
    const [y, m, d] = wibDateStr(depositDate).split("-");
    throw new AppError(
      `Tanggal bayar tidak boleh sebelum tanggal deposit (${d}/${m}/${y})`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const paymentNo = await buildPaymentNo();

  // Payment amount always equals the deposit amount — never partial
  const created = await create({
    depositId,
    paymentMethodId,
    paymentNo,
    amount:                D(deposit.amount),
    paidAt,
    referenceNo:           referenceNo           ?? null,
    notes:                 notes                 ?? null,
    transferProofUrl:      transferProofUrl      ?? null,
    transferProofPublicId: transferProofPublicId ?? null,
  });

  // Immediately mark deposit as PAID (tanggal deposit milik user tidak diubah)
  await markDepositPaid(depositId);

  await createSyncJob({
    entityType: "DEPOSIT_PAYMENT",
    entityId:   created.id,
    direction:  "APP_TO_ACCURATE",
  });

  // Re-read so the response reflects the updated deposit (status:PAID)
  return findById(created.id);
};

// ── Delete ────────────────────────────────────────────────────────────

const deleteDepositPayment = async (id) => {
  const dp = await findById(id);
  if (!dp) throw new AppError("Pembayaran deposit tidak ditemukan", StatusCodes.NOT_FOUND);

  // Deposit yang sudah di-refund/dibatalkan atau sudah dipakai di invoice tidak boleh
  // dikembalikan ke UNPAID — riwayat pemakaian/refund jadi tidak konsisten (G1-05)
  const deposit = await findDepositForPayment(dp.depositId);
  if (deposit) {
    if (["REFUNDED", "CANCELLED"].includes(deposit.status)) {
      throw new AppError(
        "Pembayaran tidak bisa dihapus karena deposit sudah di-refund atau dibatalkan",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
    if (["PARTIAL_USED", "USED"].includes(deposit.status) || (deposit._count?.invoiceDeposits ?? 0) > 0) {
      throw new AppError(
        "Pembayaran tidak bisa dihapus karena deposit sudah dipakai di invoice",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  // Best-effort: hapus dari Accurate jika sudah di-sync
  if (dp.accurateReceiptId) {
    await deleteDepositPaymentFromAccurate(dp.accurateReceiptId);
  }

  // Best-effort: hapus bukti transfer dari Cloudinary jika ada
  if (dp.transferProofPublicId) {
    try {
      await cloudinary.uploader.destroy(dp.transferProofPublicId, {
        resource_type: "image",
        invalidate:    true,
      });
    } catch {
      // Non-critical — lanjut hapus DB walaupun Cloudinary gagal
    }
  }

  // Hapus payment lalu kembalikan deposit ke UNPAID
  await removeDepositPayment(id);
  await revertDepositToUnpaid(dp.depositId);

  return { deleted: true };
};

// ── Summary ───────────────────────────────────────────────────────────

const getDepositPaymentSummary = async ({ startDate, endDate, paymentMethodId, branchId } = {}) => {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const baseWhere = {};
  if (paymentMethodId) baseWhere.paymentMethodId = paymentMethodId;
  if (branchId)        baseWhere.deposit          = { branchId };

  const todayWhere = { ...baseWhere, paidAt: { gte: today, lt: tomorrow } };

  const periodWhere = { ...baseWhere };
  if (startDate || endDate) {
    periodWhere.paidAt = {};
    if (startDate) periodWhere.paidAt.gte = wibDayStart(startDate);
    if (endDate)   periodWhere.paidAt.lte = wibDayEnd(endDate);
  }

  const [todayAgg, periodAgg] = await Promise.all([
    prisma.depositPayment.aggregate({ where: todayWhere,  _count: { id: true }, _sum: { amount: true } }),
    prisma.depositPayment.aggregate({ where: periodWhere, _count: { id: true }, _sum: { amount: true } }),
  ]);

  return {
    today:  { count: todayAgg._count.id,  total: String(todayAgg._sum.amount  ?? 0) },
    period: { count: periodAgg._count.id, total: String(periodAgg._sum.amount ?? 0) },
  };
};

// ── Resync ────────────────────────────────────────────────────────────

const resyncDepositPayment = async (id) => {
  const dp = await findById(id);
  if (!dp) throw new AppError("Pembayaran deposit tidak ditemukan", StatusCodes.NOT_FOUND);
  if (dp.accurateReceiptId) return { skipped: true, reason: "Already synced to Accurate" };
  await createSyncJob({ entityType: "DEPOSIT_PAYMENT", entityId: id, direction: "APP_TO_ACCURATE" });
  return { queued: true };
};

module.exports = { listDepositPayments, getDepositPaymentById, getPaymentsByDeposit, createDepositPayment, deleteDepositPayment, getDepositPaymentSummary, resyncDepositPayment };
