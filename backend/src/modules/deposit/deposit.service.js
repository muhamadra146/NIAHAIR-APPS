const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { createSyncJob } = require("../syncQueue/syncQueue.service");
const {
  findAll,
  count,
  findById,
  findCustomerById,
  findAppointmentById,
  create,
  updateStatus,
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

module.exports = { listDeposits, getDepositById, createDeposit, refundDeposit, cancelDeposit, linkAppointmentToDeposit };
