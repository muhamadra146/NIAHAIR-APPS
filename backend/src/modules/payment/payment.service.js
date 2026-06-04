const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { generateCommission } = require("../commission/commission.service");
const {
  findAll,
  count,
  findById,
  countToday,
  findInvoiceForPayment,
  findPaymentMethodById,
  createWithTransaction,
} = require("./payment.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── Payment number generator: PAY-YYYYMMDD-XXXX ───────────────────────

const buildPaymentNo = async () => {
  const now        = new Date();
  const yyyy       = now.getFullYear();
  const mm         = String(now.getMonth() + 1).padStart(2, "0");
  const dd         = String(now.getDate()).padStart(2, "0");
  const startOfDay = new Date(yyyy, now.getMonth(), now.getDate());
  const todayCount = await countToday(startOfDay);
  return `PAY-${yyyy}${mm}${dd}-${String(todayCount + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────

const listPayments = async ({ page, limit, invoiceId, paymentMethodId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (invoiceId)       where.invoiceId       = invoiceId;
  if (paymentMethodId) where.paymentMethodId = paymentMethodId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate)   where.createdAt.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────

const getPaymentById = async (id) => {
  const payment = await findById(id);
  if (!payment) throw new AppError("Payment not found", StatusCodes.NOT_FOUND);
  return payment;
};

// ── Create ────────────────────────────────────────────────────────────

const createPayment = async (
  { invoiceId, paymentMethodId, amount, paymentDate, referenceNo, notes },
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

  const newStatus = outstandingAmount.lte(D("0")) ? "PAID" : "PARTIAL";

  const paymentData = {
    invoiceId,
    paymentMethodId,
    paymentNo,
    amount:      D(amount),
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    referenceNo: referenceNo ?? null,
    notes:       notes       ?? null,
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

  // Commission only when invoice transitions to PAID and has treatment sessions
  if (newStatus === "PAID" && invoice.treatmentSessions.length > 0) {
    await generateCommission(invoiceId);
  }

  return payment;
};

module.exports = { listPayments, getPaymentById, createPayment };
