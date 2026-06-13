const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { createSyncJob }            = require("../syncQueue/syncQueue.service");
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

const listDepositPayments = async ({ page, limit, depositId, paymentMethodId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (depositId)       where.depositId       = depositId;
  if (paymentMethodId) where.paymentMethodId = paymentMethodId;

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

module.exports = { listDepositPayments, getDepositPaymentById, getPaymentsByDeposit, createDepositPayment };
