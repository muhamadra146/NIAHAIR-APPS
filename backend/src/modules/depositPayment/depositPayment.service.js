const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma                                                       = require("../../config/prisma");
const { createSyncJob }                                            = require("../syncQueue/syncQueue.service");
const { deleteDepositPaymentFromAccurate }                         = require("./depositPayment.sync.service");
const {
  findAll,
  count,
  findById,
  findByDepositId,
  countToday,
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
  const now        = new Date();
  const yyyy       = now.getFullYear();
  const mm         = String(now.getMonth() + 1).padStart(2, "0");
  const dd         = String(now.getDate()).padStart(2, "0");
  const startOfDay = new Date(yyyy, now.getMonth(), now.getDate());
  const todayCount = await countToday(startOfDay);
  return `DPAY-${yyyy}${mm}${dd}-${String(todayCount + 1).padStart(4, "0")}`;
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
    if (startDate) where.paidAt.gte = new Date(startDate);
    if (endDate)   where.paidAt.lte = new Date(endDate + "T23:59:59");
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
  if (!dp) throw new AppError("Deposit payment not found", StatusCodes.NOT_FOUND);
  return dp;
};

const getPaymentsByDeposit = async (depositId) => findByDepositId(depositId);

// ── Create ────────────────────────────────────────────────────────────

const createDepositPayment = async ({ depositId, paymentMethodId, paidAt: paidAtInput, referenceNo, notes, transferProofUrl, transferProofPublicId }) => {
  const deposit = await findDepositForPayment(depositId);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  // Only UNPAID deposits can receive a payment
  const blocked = ["PAID", "PARTIAL_USED", "USED", "CANCELLED", "REFUNDED"];
  if (blocked.includes(deposit.status)) {
    throw new AppError(
      `Cannot pay deposit with status ${deposit.status}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const paymentMethod = await findPaymentMethodById(paymentMethodId);
  if (!paymentMethod) throw new AppError("Payment method not found", StatusCodes.NOT_FOUND);
  if (!paymentMethod.isActive) {
    throw new AppError("Payment method is not active", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const paymentNo = await buildPaymentNo();
  const paidAt    = paidAtInput ? new Date(paidAtInput) : new Date();

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

  // Immediately mark deposit as PAID
  await markDepositPaid(depositId, paidAt);

  await createSyncJob({
    entityType: "DEPOSIT_PAYMENT",
    entityId:   created.id,
    direction:  "APP_TO_ACCURATE",
  });

  // Re-read so the response reflects the updated deposit (status:PAID, paidAt set)
  return findById(created.id);
};

// ── Delete ────────────────────────────────────────────────────────────

const deleteDepositPayment = async (id) => {
  const dp = await findById(id);
  if (!dp) throw new AppError("Deposit payment not found", StatusCodes.NOT_FOUND);

  // Best-effort: hapus dari Accurate jika sudah di-sync
  if (dp.accurateReceiptId) {
    await deleteDepositPaymentFromAccurate(dp.accurateReceiptId);
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
    if (startDate) periodWhere.paidAt.gte = new Date(startDate);
    if (endDate)   periodWhere.paidAt.lte = new Date(endDate + "T23:59:59");
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
  if (!dp) throw new AppError("Deposit payment not found", StatusCodes.NOT_FOUND);
  if (dp.accurateReceiptId) return { skipped: true, reason: "Already synced to Accurate" };
  await createSyncJob({ entityType: "DEPOSIT_PAYMENT", entityId: id, direction: "APP_TO_ACCURATE" });
  return { queued: true };
};

module.exports = { listDepositPayments, getDepositPaymentById, getPaymentsByDeposit, createDepositPayment, deleteDepositPayment, getDepositPaymentSummary, resyncDepositPayment };
