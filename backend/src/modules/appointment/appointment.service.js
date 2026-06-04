const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll,
  count,
  findById,
  countToday,
  findCustomerById,
  findBranchById,
  createWithTransaction,
  updateAppointment,
  changeStatusWithTransaction,
} = require("./appointment.repository");

// ── Status transition rules ───────────────────────────────────────────
//
// Normal:  BOOKED → CONFIRMED → CHECK_IN → IN_PROGRESS → COMPLETED
// Cancel:  BOOKED / CONFIRMED / CHECK_IN → CANCELLED
// No-show: BOOKED / CONFIRMED → NO_SHOW

const VALID_TRANSITIONS = {
  BOOKED:      ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED:   ["CHECK_IN",  "CANCELLED", "NO_SHOW"],
  CHECK_IN:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};

// ── Booking number generator: BKG-YYYYMMDD-XXXX ───────────────────────

const buildBookingNo = async () => {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");

  const startOfDay = new Date(yyyy, now.getMonth(), now.getDate());
  const todayCount = await countToday(startOfDay);

  return `BKG-${yyyy}${mm}${dd}-${String(todayCount + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────

const listAppointments = async ({ page, limit, customerId, branchId, status, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (customerId) where.customerId = customerId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;

  if (startDate || endDate) {
    where.visitDate = {};
    if (startDate) where.visitDate.gte = new Date(startDate);
    if (endDate)   where.visitDate.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────

const getAppointmentById = async (id) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);
  return appointment;
};

// ── Create ────────────────────────────────────────────────────────────

const createAppointment = async (body, userId) => {
  const { customerId, branchId, visitDate, startTime, endTime, notes, estimatedTotal } = body;

  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  const bookingNo = await buildBookingNo();

  const appointmentData = {
    customerId,
    branchId,
    bookingNo,
    bookingDate:    new Date(),
    visitDate:      new Date(visitDate),
    startTime:      new Date(startTime),
    endTime:        new Date(endTime),
    status:         "BOOKED",
    notes:          notes ?? null,
    estimatedTotal: estimatedTotal !== undefined ? String(estimatedTotal) : null,
  };

  return createWithTransaction({ appointmentData, userId });
};

// ── Update fields ─────────────────────────────────────────────────────

const updateAppointmentById = async (id, body, userId) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  if (appointment.status === "CANCELLED") {
    throw new AppError("Cannot modify a cancelled appointment", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const { visitDate, startTime, endTime, notes, estimatedTotal } = body;

  const hasUpdate = visitDate !== undefined || startTime !== undefined ||
                    endTime   !== undefined || notes     !== undefined ||
                    estimatedTotal !== undefined;

  if (!hasUpdate) {
    throw new AppError("No fields to update", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const data = {};
  if (visitDate      !== undefined) data.visitDate      = new Date(visitDate);
  if (startTime      !== undefined) data.startTime      = new Date(startTime);
  if (endTime        !== undefined) data.endTime        = new Date(endTime);
  if (notes          !== undefined) data.notes          = notes;
  if (estimatedTotal !== undefined) data.estimatedTotal = String(estimatedTotal);

  return updateAppointment(id, data);
};

// ── Change status ─────────────────────────────────────────────────────

const changeAppointmentStatus = async (id, body, userId) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  const { status: newStatus, notes } = body;
  const currentStatus = appointment.status;

  if (newStatus === currentStatus) {
    throw new AppError(
      `Appointment is already ${currentStatus}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return changeStatusWithTransaction({ appointment, newStatus, notes, userId });
};

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentById,
  changeAppointmentStatus,
};
