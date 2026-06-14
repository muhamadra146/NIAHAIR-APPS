const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
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
  updateWithStaff,
  changeStatusWithTransaction,
} = require("./appointment.repository");
const { getAvailableStaff } = require("../staffSchedule/staffSchedule.service");

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

  return { appointments: data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────

const getAppointmentById = async (id) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);
  return appointment;
};

// ── DateTime helpers ──────────────────────────────────────────────────
//
// Frontend sends visitDate as "YYYY-MM-DD" and startTime/endTime as "HH:MM".
// We combine them here so the DB stores a proper DateTime.

const combineDatetime = (dateStr, timeStr) =>
  new Date(`${dateStr.split("T")[0]}T${timeStr}:00`);

// ── Create ────────────────────────────────────────────────────────────

const createAppointment = async (body, userId, createdByEmployeeId = null) => {
  const {
    customerId, branchId, visitDate, startTime, endTime,
    type = "SALON", homeServiceAddress,
    notes, estimatedTotal, services = [], staffsBySlot = [],
  } = body;

  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  if (staffsBySlot.length > 0) {
    const employeeIds  = staffsBySlot.map((s) => s.employeeId);
    const available    = await getAvailableStaff({ date: visitDate, branchId, startTime, endTime });
    const availableSet = new Set(available.map((s) => s.employeeId));
    const unavailable  = employeeIds.filter((id) => !availableSet.has(id));
    if (unavailable.length > 0) {
      throw new AppError("Staff not available at selected time", StatusCodes.UNPROCESSABLE_ENTITY);
    }
  }

  const bookingNo = await buildBookingNo();

  // Auto-calculate estimatedTotal from services when provided
  const computedTotal = services.length > 0
    ? String(services.reduce((sum, s) => sum + Number(s.qty) * Number(s.price), 0))
    : estimatedTotal !== undefined ? String(estimatedTotal) : null;

  // Auto-fill address from customer if HS and no address provided
  let resolvedAddress = homeServiceAddress ?? null;
  if (type === "HOME_SERVICE" && !resolvedAddress && customer.address) {
    resolvedAddress = customer.address;
  }

  const appointmentData = {
    customerId,
    branchId,
    bookingNo,
    bookingDate:         new Date(),
    visitDate:           new Date(visitDate),
    startTime:           combineDatetime(visitDate, startTime),
    endTime:             combineDatetime(visitDate, endTime),
    status:              "BOOKED",
    type:                type ?? "SALON",
    homeServiceAddress:  resolvedAddress,
    notes:               notes ?? null,
    estimatedTotal:      computedTotal,
    createdByEmployeeId: createdByEmployeeId ?? null,
  };

  // Map frontend { itemId } → repository { serviceItemId }
  const mappedServices = services.map((s) => ({
    serviceItemId:   s.itemId,
    qty:             s.qty,
    price:           s.price,
    durationMinutes: s.durationMinutes ?? 0,
    notes:           s.notes ?? null,
  }));

  return createWithTransaction({ appointmentData, services: mappedServices, staffsBySlot, userId });
};

// ── Update fields ─────────────────────────────────────────────────────

const pad    = (n)  => String(n).padStart(2, "0");
const toHHMM = (dt) => `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

const updateAppointmentById = async (id, body, userId) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  if (appointment.status === "CANCELLED") {
    throw new AppError("Cannot modify a cancelled appointment", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const { visitDate, startTime, endTime, type, homeServiceAddress, notes, estimatedTotal, staffsBySlot } = body;

  const hasUpdate = visitDate !== undefined || startTime     !== undefined ||
                    endTime   !== undefined || notes         !== undefined ||
                    estimatedTotal !== undefined || staffsBySlot !== undefined ||
                    type !== undefined || homeServiceAddress !== undefined;

  if (!hasUpdate) {
    throw new AppError("No fields to update", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Validate staff availability when staffsBySlot are being set
  if (staffsBySlot !== undefined && staffsBySlot.length > 0) {
    const employeeIds      = staffsBySlot.map((s) => s.employeeId);
    const effectiveDateStr = visitDate
      ? visitDate.split("T")[0]
      : appointment.visitDate.toISOString().split("T")[0];
    const effectiveStart = startTime ?? toHHMM(appointment.startTime);
    const effectiveEnd   = endTime   ?? toHHMM(appointment.endTime);

    const available    = await getAvailableStaff({
      date:                 effectiveDateStr,
      branchId:             appointment.branchId,
      startTime:            effectiveStart,
      endTime:              effectiveEnd,
      excludeAppointmentId: id,
    });
    const availableSet = new Set(available.map((s) => s.employeeId));
    const unavailable  = employeeIds.filter((empId) => !availableSet.has(empId));
    if (unavailable.length > 0) {
      throw new AppError("Staff not available at selected time", StatusCodes.UNPROCESSABLE_ENTITY);
    }
  }

  // Use the new visitDate if provided, otherwise keep the existing one as base for time combination
  const baseDateStr = visitDate
    ? visitDate.split("T")[0]
    : appointment.visitDate.toISOString().split("T")[0];

  const data = {};
  if (visitDate           !== undefined) data.visitDate           = new Date(visitDate);
  if (startTime           !== undefined) data.startTime           = combineDatetime(baseDateStr, startTime);
  if (endTime             !== undefined) data.endTime             = combineDatetime(baseDateStr, endTime);
  if (notes               !== undefined) data.notes               = notes;
  if (estimatedTotal      !== undefined) data.estimatedTotal      = String(estimatedTotal);
  if (type                !== undefined) data.type                = type;
  if (homeServiceAddress  !== undefined) data.homeServiceAddress  = homeServiceAddress;

  return updateWithStaff(id, data, staffsBySlot);
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

const deleteAppointmentById = async (id) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  await prisma.$transaction([
    prisma.appointmentStaff.deleteMany({ where: { appointmentId: id } }),
    prisma.appointmentService.deleteMany({ where: { appointmentId: id } }),
    prisma.appointmentStatusHistory.deleteMany({ where: { appointmentId: id } }),
    prisma.deposit.updateMany({ where: { appointmentId: id }, data: { appointmentId: null } }),
    prisma.invoice.updateMany({ where: { appointmentId: id }, data: { appointmentId: null } }),
    prisma.treatmentSession.updateMany({ where: { appointmentId: id }, data: { appointmentId: null } }),
    prisma.appointment.delete({ where: { id } }),
  ]);
};

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentById,
  changeAppointmentStatus,
  deleteAppointmentById,
};
