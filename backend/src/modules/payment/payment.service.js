const { Prisma }      = require("@prisma/client");
const { dailyPrefix, nextDailyNumber } = require("../../utils/dailyNumber");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { wibDayStart, wibDayEnd }   = require("../../utils/date");
const prisma          = require("../../config/prisma");
const { handleInvoicePaid } = require("../invoice/invoice.workflow");
const { resolveInvoiceStatus } = require("../invoice/invoice.status");
const { createSyncJob }            = require("../syncQueue/syncQueue.service");
const { deletePaymentFromAccurate } = require("./payment.sync.service");
const {
  findAll,
  count,
  findById,
  findPaymentById,
  findLastNumber,
  findInvoiceForPayment,
  findInvoiceForDelete,
  findPaymentMethodById,
  createWithTransaction,
  deleteWithTransaction,
} = require("./payment.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── Payment number generator: PAY-YYYYMMDD-XXXX ───────────────────────

const buildPaymentNo = async () => {
  // Nomor terbesar hari ini + 1 (bukan jumlah + 1 — bentrok setelah ada yang dihapus)
  const prefix = dailyPrefix("PAY");
  return nextDailyNumber(prefix, await findLastNumber(prefix));
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
    if (startDate) where.paymentDate.gte = wibDayStart(startDate);
    if (endDate)   where.paymentDate.lte = wibDayEnd(endDate);
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
  if (!payment) throw new AppError("Pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);

  const invoice = await findInvoiceForDelete(payment.invoiceId);
  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);

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
    if (startDate) periodWhere.paymentDate.gte = wibDayStart(startDate);
    if (endDate)   periodWhere.paymentDate.lte = wibDayEnd(endDate);
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
  if (!payment) throw new AppError("Pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);
  return payment;
};

// ── Create ────────────────────────────────────────────────────────────

const createPayment = async (
  { invoiceId, paymentMethodId, amount, paymentDate, referenceNo, notes, branchId, createdByEmployeeId },
  userId
) => {
  if (!invoiceId) {
    throw new AppError("Invoice wajib dipilih", StatusCodes.BAD_REQUEST);
  }

  const invoice = await findInvoiceForPayment(invoiceId);
  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);

  if (invoice.status === "CANCELLED") {
    throw new AppError("Invoice yang sudah dibatalkan tidak bisa dibayar", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (invoice.status === "PAID") {
    throw new AppError("Invoice sudah lunas", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Branch must match invoice — prevents cross-branch payment
  if (branchId && invoice.branchId !== branchId) {
    throw new AppError(
      "Cabang pembayaran tidak sama dengan cabang invoice",
      StatusCodes.FORBIDDEN
    );
  }

  const paymentMethod = await findPaymentMethodById(paymentMethodId);
  if (!paymentMethod) throw new AppError("Metode pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!paymentMethod.isActive) {
    throw new AppError("Metode pembayaran tidak aktif", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Pembayaran tidak boleh melebihi sisa tagihan (G1-08, keputusan owner) —
  // uang kembalian ditangani kasir, tidak dicatat
  const remaining = D(invoice.grandTotal).sub(D(invoice.totalDeposit)).sub(D(invoice.paidAmount));
  if (D(amount).gt(remaining)) {
    const label = Number(Prisma.Decimal.max(D("0"), remaining)).toLocaleString("id-ID");
    throw new AppError(`Pembayaran melebihi sisa tagihan (Rp ${label})`, StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const paymentNo = await buildPaymentNo();

  const newPaidAmount = D(invoice.paidAmount).add(D(amount));

  // Floor at 0 (pengaman — overpayment sudah ditolak di atas)
  const outstandingAmount = Prisma.Decimal.max(
    D("0"),
    D(invoice.grandTotal).sub(D(invoice.totalDeposit)).sub(newPaidAmount)
  );

  const newStatus = resolveInvoiceStatus(outstandingAmount, D(invoice.totalDeposit).add(newPaidAmount));

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
