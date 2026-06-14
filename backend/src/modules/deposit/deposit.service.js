const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma          = require("../../config/prisma");
const { createSyncJob }                                       = require("../syncQueue/syncQueue.service");
const { updateDepositInAccurate, deleteDepositFromAccurate }  = require("./deposit.sync.service");
const {
  findAll,
  count,
  findById,
  findCustomerById,
  findAppointmentById,
  create,
  updateStatus,
  updateDeposit,
  removeDeposit,
  updateAppointmentLink,
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

const listDeposits = async ({ page, limit, customerId, appointmentId, status, branchId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (customerId)    where.customerId    = customerId;
  if (appointmentId) where.appointmentId = appointmentId;
  if (status)        where.status        = status;
  if (branchId)      where.branchId      = branchId;

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
    data: deposits.map(withComputed),
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

// ── Single ────────────────────────────────────────────────────────────

const getDepositById = async (id) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);
  return withComputed(deposit);
};

// ── Create ────────────────────────────────────────────────────────────

const createDeposit = async ({ customerId, appointmentId, amount, notes, branchId, createdByEmployeeId }) => {
  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  if (appointmentId) {
    const appointment = await findAppointmentById(appointmentId);
    if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);
    if (appointment.customerId !== customerId) {
      throw new AppError(
        "Appointment does not belong to the specified customer",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  const deposit = await create({
    customerId,
    appointmentId: appointmentId ?? null,
    branchId,
    createdByEmployeeId: createdByEmployeeId ?? null,
    amount: D(amount),
    status: "UNPAID",
    paidAt: null,
    notes:  notes ?? null,
  });

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

  const cancellable = ["PENDING", "UNPAID", "PAID"];
  if (!cancellable.includes(deposit.status)) {
    throw new AppError(
      `Cannot cancel deposit with status ${deposit.status}. Only PENDING, UNPAID and PAID can be cancelled.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const updated = await updateStatus(id, "CANCELLED");
  return withComputed(updated);
};

// ── Update ────────────────────────────────────────────────────────────

const editDeposit = async (id, { notes, amount }) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  const data = {};
  if (notes !== undefined) data.notes = notes ?? null;

  if (amount !== undefined) {
    if (deposit.status !== "UNPAID") {
      throw new AppError("Cannot change amount after deposit has been paid", StatusCodes.UNPROCESSABLE_ENTITY);
    }
    data.amount = D(amount);
  }

  const updated = await updateDeposit(id, data);

  // If amount changed and deposit is already in Accurate, update there too
  if (amount !== undefined && deposit.accurateDepositId) {
    await updateDepositInAccurate(id);
  }

  return withComputed(updated);
};

// ── Delete ────────────────────────────────────────────────────────────

const deleteDeposit = async (id) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  if (deposit.invoiceDeposits?.length > 0) {
    throw new AppError(
      "Cannot delete deposit that has been applied to an invoice",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const blocked = ["PAID", "PARTIAL_USED", "USED"];
  if (blocked.includes(deposit.status)) {
    throw new AppError(
      `Cannot delete deposit with status ${deposit.status}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  if (deposit.accurateDepositId) {
    await deleteDepositFromAccurate(deposit.accurateDepositId);
  }

  await removeDeposit(id);
  return { deleted: true };
};

// ── Link appointment ──────────────────────────────────────────────────

const linkAppointmentToDeposit = async (id, appointmentId) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  if (appointment.customerId !== deposit.customerId) {
    throw new AppError(
      "Appointment does not belong to the same customer as this deposit",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const updated = await updateAppointmentLink(id, appointmentId);
  return withComputed(updated);
};

// ── Summary ───────────────────────────────────────────────────────────

const getDepositSummary = async ({ branchId } = {}) => {
  const baseWhere = branchId ? { branchId } : {};
  const statuses  = ["UNPAID", "PAID", "PARTIAL_USED", "USED"];

  const results = await Promise.all(
    statuses.map((s) =>
      prisma.deposit.aggregate({
        where: { ...baseWhere, status: s },
        _count: { id: true },
        _sum:   { amount: true },
      })
    )
  );

  return Object.fromEntries(
    statuses.map((s, i) => [s, { count: results[i]._count.id, total: String(results[i]._sum.amount ?? 0) }])
  );
};

// ── Resync ────────────────────────────────────────────────────────────

const resyncDeposit = async (id) => {
  const deposit = await findById(id);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  if (deposit.accurateDepositId) {
    await updateDepositInAccurate(id);
    return { updated: true };
  }

  await createSyncJob({ entityType: "DEPOSIT", entityId: id, direction: "APP_TO_ACCURATE" });
  return { queued: true };
};

module.exports = { listDeposits, getDepositById, createDeposit, editDeposit, deleteDeposit, refundDeposit, cancelDeposit, linkAppointmentToDeposit, getDepositSummary, resyncDeposit };
