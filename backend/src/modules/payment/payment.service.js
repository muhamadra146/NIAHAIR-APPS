const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma          = require("../../config/prisma");
const { handleInvoicePaid } = require("../invoice/invoice.workflow");
const { createSyncJob }            = require("../syncQueue/syncQueue.service");
const { deletePaymentFromAccurate } = require("./payment.sync.service");
const {
  findAll,
  count,
  findById,
  findPaymentById,
  countToday,
  findInvoiceForPayment,
  findInvoiceForDelete,
  findPaymentMethodById,
  createWithTransaction,
  deleteWithTransaction,
} = require("./payment.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── Payment number generator: PAY-YYYYMMDD-XXXX ───────────────────────

const buildPaymentNo = async () => {
  const now        = new Date(Date.now() + 7 * 3600 * 1000); // WIB (UTC+7)
  const yyyy       = now.getUTCFullYear();
  const mm         = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd         = String(now.getUTCDate()).padStart(2, "0");
  const startOfDay = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate()) - 7 * 3600 * 1000);
  const todayCount = await countToday(startOfDay);
  return `PAY-${yyyy}${mm}${dd}-${String(todayCount + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────

const listPayments = async ({ page, limit, invoiceId, paymentMethodId, branchId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (invoiceId)       where.invoiceId       = invoiceId;
  if (paymentMethodId) where.paymentMethodId = paymentMethodId;
  if (branchId)        where.branchId        = branchId;

  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) where.paymentDate.gte = new Date(startDate);
    if (endDate)   where.paymentDate.lte = new Date(endDate + "T23:59:59");
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Delete ────────────────────────────────────────────────────────────

const deletePayment = async (id, userId) => {
  const payment = await findById(id);
  if (!payment) throw new AppError("Payment not found", StatusCodes.NOT_FOUND);

  const invoice = await findInvoiceForDelete(payment.invoiceId);
  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

  if (invoice._count.commissions > 0) {
    throw new AppError(
      "Pembayaran tidak dapat dihapus karena komisi invoice ini sudah digenerate. Hapus komisi terlebih dahulu.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  if (payment.accurateReceiptId) {
    await deletePaymentFromAccurate(payment.accurateReceiptId);
  }

  await deleteWithTransaction({ payment, invoice, D, userId });
  return { deleted: true };
};

// ── Summary ───────────────────────────────────────────────────────────

const getPaymentSummary = async ({ startDate, endDate, paymentMethodId, branchId } = {}) => {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const baseWhere = {};
  if (paymentMethodId) baseWhere.paymentMethodId = paymentMethodId;
  if (branchId)        baseWhere.branchId        = branchId;

  const todayWhere  = { ...baseWhere, paymentDate: { gte: today, lt: tomorrow } };
  const periodWhere = { ...baseWhere };
  if (startDate || endDate) {
    periodWhere.paymentDate = {};
    if (startDate) periodWhere.paymentDate.gte = new Date(startDate);
    if (endDate)   periodWhere.paymentDate.lte = new Date(endDate + "T23:59:59");
  }

  const [todayAgg, periodAgg] = await Promise.all([
    prisma.payment.aggregate({ where: todayWhere,  _count: { id: true }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: periodWhere, _count: { id: true }, _sum: { amount: true } }),
  ]);

  return {
    today:  { count: todayAgg._count.id,  total: String(todayAgg._sum.amount  ?? 0) },
    period: { count: periodAgg._count.id, total: String(periodAgg._sum.amount ?? 0) },
  };
};

// ── Single ────────────────────────────────────────────────────────────

const getPaymentById = async (id) => {
  const payment = await findById(id);
  if (!payment) throw new AppError("Payment not found", StatusCodes.NOT_FOUND);
  return payment;
};

// ── Create ────────────────────────────────────────────────────────────

const createPayment = async (
  { invoiceId, paymentMethodId, amount, paymentDate, referenceNo, notes, branchId, createdByEmployeeId },
  userId
) => {
  if (!invoiceId) {
    throw new AppError("invoiceId is required", StatusCodes.BAD_REQUEST);
  }

  const invoice = await findInvoiceForPayment(invoiceId);
  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

  if (invoice.status === "CANCELLED") {
    throw new AppError("Cannot pay a cancelled invoice", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (invoice.status === "PAID") {
    throw new AppError("Invoice is already fully paid", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Branch must match invoice — prevents cross-branch payment
  if (branchId && invoice.branchId !== branchId) {
    throw new AppError(
      `Branch mismatch: payment branch does not match invoice branch`,
      StatusCodes.FORBIDDEN
    );
  }

  const paymentMethod = await findPaymentMethodById(paymentMethodId);
  if (!paymentMethod) throw new AppError("Payment method not found", StatusCodes.NOT_FOUND);
  if (!paymentMethod.isActive) {
    throw new AppError("Payment method is not active", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const paymentNo = await buildPaymentNo();

  const newPaidAmount = D(invoice.paidAmount).add(D(amount));

  // Overpayment allowed — floor at 0
  const outstandingAmount = Prisma.Decimal.max(
    D("0"),
    D(invoice.grandTotal).sub(D(invoice.totalDeposit)).sub(newPaidAmount)
  );

  const newStatus = outstandingAmount.lte(D("0")) ? "PAID" : "UNPAID";

  const paymentData = {
    invoiceId,
    paymentMethodId,
    paymentNo,
    amount:              D(amount),
    paymentDate:         paymentDate ? new Date(paymentDate) : new Date(),
    referenceNo:         referenceNo ?? null,
    notes:               notes       ?? null,
    branchId:            branchId ?? invoice.branchId,
    createdByEmployeeId: createdByEmployeeId ?? null,
  };

  const payment = await createWithTransaction({
    paymentData,
    invoiceId,
    newPaidAmount,
    outstandingAmount,
    oldStatus: invoice.status,
    newStatus,
    userId,
  });

  if (newStatus === "PAID") {
    await handleInvoicePaid(invoiceId, userId);
  }

  // Queue Accurate push — worker picks it up asynchronously
  await createSyncJob({
    entityType: "PAYMENT",
    entityId:   payment.id,
    direction:  "APP_TO_ACCURATE",
  });

  // Fresh read — reflects final invoice status after all side-effects commit
  return findPaymentById(payment.id);
};

module.exports = { listPayments, getPaymentById, createPayment, deletePayment, getPaymentSummary };
