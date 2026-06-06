const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { createSyncJob } = require("../syncQueue/syncQueue.service");
const {
  findAll,
  count,
  findById,
  findAppointmentById,
  findPaymentMethodById,
  create,
  updateStatus,
} = require("./deposit.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── Computed fields ───────────────────────────────────────────────────
// usedAmount and remainingAmount are derived from InvoiceDeposit records.
// They are never stored — calculated at read time.

const withComputed = (deposit) => {
  const usedAmount = deposit.invoiceDeposits.reduce(
    (sum, id) => sum.add(D(id.amountApplied)),
    D("0")
  );
  const remainingAmount = D(deposit.amount).sub(usedAmount);
  return { ...deposit, usedAmount, remainingAmount };
};

// ── List ──────────────────────────────────────────────────────────────

const listDeposits = async ({ page, limit, appointmentId, status, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (appointmentId) where.appointmentId = appointmentId;
  if (status)        where.status        = status;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate)   where.createdAt.lte = new Date(endDate);
  }

  const [deposits, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data:  deposits.map(withComputed),
    meta:  paginationMeta(total, pageNum, limitNum),
  };
};

// ── Single ────────────────────────────────────────────────────────────

const getDepositById = async (id) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);
  return withComputed(deposit);
};

// ── Create ────────────────────────────────────────────────────────────

const createDeposit = async ({ appointmentId, paymentMethodId, amount, paidAt, notes, branchId, createdByEmployeeId }) => {
  if (!appointmentId) {
    throw new AppError("appointmentId is required", StatusCodes.BAD_REQUEST);
  }

  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  const paymentMethod = await findPaymentMethodById(paymentMethodId);
  if (!paymentMethod) throw new AppError("Payment method not found", StatusCodes.NOT_FOUND);
  if (!paymentMethod.isActive) {
    throw new AppError("Payment method is not active", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const deposit = await create({
    appointmentId,
    paymentMethodId,
    branchId,
    createdByEmployeeId: createdByEmployeeId ?? null,
    amount:  D(amount),
    status:  "PAID",
    paidAt:  paidAt ? new Date(paidAt) : new Date(),
    notes:   notes ?? null,
  });

  // Queue Accurate push — worker picks it up asynchronously
  await createSyncJob({
    entityType: "DEPOSIT",
    entityId:   deposit.id,
    direction:  "APP_TO_ACCURATE",
  });

  return withComputed(deposit);
};

// ── Refund ────────────────────────────────────────────────────────────

const refundDeposit = async (id) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  const refundable = ["PAID", "PARTIAL_USED"];
  if (!refundable.includes(deposit.status)) {
    throw new AppError(
      `Cannot refund deposit with status ${deposit.status}. Only PAID and PARTIAL_USED can be refunded.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const updated = await updateStatus(id, "REFUNDED");
  return withComputed(updated);
};

// ── Cancel ────────────────────────────────────────────────────────────

const cancelDeposit = async (id) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  const cancellable = ["PENDING", "PAID"];
  if (!cancellable.includes(deposit.status)) {
    throw new AppError(
      `Cannot cancel deposit with status ${deposit.status}. Only PENDING and PAID can be cancelled.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const updated = await updateStatus(id, "CANCELLED");
  return withComputed(updated);
};

module.exports = { listDeposits, getDepositById, createDeposit, refundDeposit, cancelDeposit };
