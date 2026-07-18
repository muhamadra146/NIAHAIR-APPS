const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const cloudinary      = require("../../config/cloudinary");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");

const ORDER_MAP = {
  visitDate:    { visitDate: "asc" },
  "-visitDate": { visitDate: "desc" },
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  status:       { status: "asc" },
  "-status":    { status: "desc" },
};
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
  rescheduleWithTransaction,
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
  const now  = new Date(Date.now() + 7 * 3600 * 1000); // WIB (UTC+7)
  const yyyy = now.getUTCFullYear();
  const mm   = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd   = String(now.getUTCDate()).padStart(2, "0");

  const startOfDay = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate()) - 7 * 3600 * 1000);
  const todayCount = await countToday(startOfDay);

  return `BKG-${yyyy}${mm}${dd}-${String(todayCount + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────

const listAppointments = async ({ page, limit, customerId, branchId, status, startDate, endDate, sortBy, employeeId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP, "-visitDate");

  const where = {};
  if (customerId)  where.customerId  = customerId;
  if (branchId)    where.branchId    = branchId;
  if (status)      where.status      = status;
  if (employeeId)  where.staffs      = { some: { employeeId } };

  if (startDate || endDate) {
    where.visitDate = {};
    if (startDate) where.visitDate.gte = new Date(startDate);
    if (endDate)   where.visitDate.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
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
  new Date(`${dateStr.split("T")[0]}T${timeStr}:00+07:00`);

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

  const { status: newStatus, notes, cancelReason } = body;
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

  if (newStatus === "CANCELLED" && !cancelReason) {
    throw new AppError("cancelReason is required when cancelling", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  if (newStatus === "COMPLETED") {
    const paidInvoice = await prisma.invoice.findFirst({
      where: { appointmentId: id, status: "PAID" },
    });
    if (!paidInvoice) {
      throw new AppError(
        "Booking tidak dapat diselesaikan. Invoice harus sudah lunas (PAID) terlebih dahulu.",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  return changeStatusWithTransaction({ appointment, newStatus, notes, cancelReason, userId });
};

const rescheduleAppointment = async (id, body, userId) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  if (["COMPLETED", "CANCELLED"].includes(appointment.status)) {
    throw new AppError(
      `Cannot reschedule a ${appointment.status.toLowerCase()} appointment`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const { visitDate, startTime, endTime, reason } = body;

  const newVisitDate  = new Date(visitDate);
  const newStartTime  = combineDatetime(visitDate, startTime);
  const newEndTime    = combineDatetime(visitDate, endTime);

  return rescheduleWithTransaction({ appointment, newVisitDate, newStartTime, newEndTime, reason, userId });
};

const deleteAppointmentById = async (id) => {
  const appointment = await findById(id);
  if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  // Hapus foto dari Cloudinary sebelum delete DB (best-effort, tidak membatalkan delete jika gagal)
  const photos = await prisma.appointmentPhoto.findMany({
    where:  { appointmentId: id },
    select: { publicId: true },
  });
  await Promise.allSettled(photos.map((p) => cloudinary.uploader.destroy(p.publicId)));

  await prisma.$transaction([
    prisma.appointmentStaff.deleteMany({ where: { appointmentId: id } }),
    prisma.appointmentService.deleteMany({ where: { appointmentId: id } }),
    prisma.appointmentStatusHistory.deleteMany({ where: { appointmentId: id } }),
    prisma.appointmentRescheduleHistory.deleteMany({ where: { appointmentId: id } }),
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
  rescheduleAppointment,
  deleteAppointmentById,
};
