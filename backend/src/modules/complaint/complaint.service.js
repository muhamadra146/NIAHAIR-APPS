const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma          = require("../../config/prisma");
const repo            = require("./complaint.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── Complaint number generator: KMP-YYYYMMDD-XXXX ────────────────────
const buildComplaintNo = async () => {
  const today  = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  const yyyy   = today.getUTCFullYear();
  const mm     = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd     = String(today.getUTCDate()).padStart(2, "0");
  const prefix = `KMP-${yyyy}${mm}${dd}-`;
  const maxSeq = await repo.findMaxSeqToday(prefix);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

// ── Stats ─────────────────────────────────────────────────────────────
const getStats = async ({ branchId }) => {
  const baseWhere = branchId ? { branchId } : {};

  // Bulan ini & bulan lalu (WIB UTC+7)
  const now        = new Date(Date.now() + 7 * 3600 * 1000);
  const thisMonth  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 7 * 3600 * 1000);
  const lastMonth  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1) - 7 * 3600 * 1000);
  const nextMonth  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 7 * 3600 * 1000);

  const [
    byStatus,
    bySeverity,
    byCategory,
    totalThisMonth,
    totalLastMonth,
    resolvedWithTime,
  ] = await Promise.all([
    // count per status
    prisma.complaint.groupBy({ by: ["status"],   where: baseWhere, _count: true }),
    // count per severity
    prisma.complaint.groupBy({ by: ["severity"], where: baseWhere, _count: true }),
    // count per category
    prisma.complaint.groupBy({ by: ["category"], where: baseWhere, _count: true, orderBy: { _count: { category: "desc" } } }),
    // bulan ini
    prisma.complaint.count({ where: { ...baseWhere, createdAt: { gte: thisMonth, lt: nextMonth } } }),
    // bulan lalu
    prisma.complaint.count({ where: { ...baseWhere, createdAt: { gte: lastMonth, lt: thisMonth } } }),
    // untuk avg resolve time: komplain yg punya resolvedAt
    prisma.complaint.findMany({
      where:  { ...baseWhere, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
  ]);

  const total       = byStatus.reduce((s, r) => s + r._count, 0);
  const openCount   = byStatus.find((r) => r.status === "OPEN")?._count        ?? 0;
  const inProgCount = byStatus.find((r) => r.status === "IN_PROGRESS")?._count ?? 0;
  const resolvedCnt = byStatus.find((r) => r.status === "RESOLVED")?._count    ?? 0;
  const closedCount = byStatus.find((r) => r.status === "CLOSED")?._count      ?? 0;

  // Rata-rata waktu penyelesaian dalam hari
  let avgResolveDays = null;
  if (resolvedWithTime.length > 0) {
    const totalMs = resolvedWithTime.reduce((sum, c) => {
      return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
    }, 0);
    avgResolveDays = +(totalMs / resolvedWithTime.length / 86400000).toFixed(1);
  }

  const resolveRate = total > 0 ? +((resolvedCnt + closedCount) / total * 100).toFixed(1) : 0;

  return {
    total,
    byStatus: { OPEN: openCount, IN_PROGRESS: inProgCount, RESOLVED: resolvedCnt, CLOSED: closedCount },
    bySeverity: Object.fromEntries(bySeverity.map((r) => [r.severity, r._count])),
    byCategory: byCategory.map((r) => ({ category: r.category, count: r._count })),
    thisMonth:  totalThisMonth,
    lastMonth:  totalLastMonth,
    resolveRate,
    avgResolveDays,
  };
};

// ── List ──────────────────────────────────────────────────────────────
const getAll = async ({ page = 1, limit = 20, branchId, status, employeeId, severity, search, startDate, endDate }) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  if (employeeId) where.employeeId = employeeId;
  if (severity)   where.severity   = severity;

  // Search by nama klien (via appointment.customer)
  if (search) {
    where.appointment = {
      customer: { name: { contains: search, mode: "insensitive" } },
    };
  }

  // Date range filter (createdAt)
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

// ── Single ────────────────────────────────────────────────────────────
const getById = async (id) => {
  const c = await repo.findById(id);
  if (!c) throw new AppError("Komplain tidak ditemukan", StatusCodes.NOT_FOUND);
  return c;
};

// ── Create ────────────────────────────────────────────────────────────
const create = async (body, userId) => {
  const {
    branchId, appointmentId, invoiceId, employeeId,
    category, severity = "MEDIUM", description,
    followUpDate, chatNotes,
    repairDate, repairNotes, repairStaff, repairAssistant,
  } = body;

  // Pastikan appointment ada
  const appointment = await prisma.appointment.findUnique({
    where:  { id: appointmentId },
    select: { id: true, branchId: true },
  });
  if (!appointment) throw new AppError("Appointment tidak ditemukan", StatusCodes.NOT_FOUND);

  const complaintNo = await buildComplaintNo();

  return repo.create({
    complaintNo,
    branchId:      branchId ?? appointment.branchId,
    appointmentId,
    invoiceId:     invoiceId  ?? null,
    employeeId:    employeeId ?? null,
    category,
    severity,
    description,
    status:    "OPEN",
    createdBy: userId ?? null,
    // Follow up & komunikasi
    followUpDate:    followUpDate ? new Date(followUpDate) : null,
    chatNotes:       chatNotes    ?? null,
    // Perbaikan
    repairDate:      repairDate ? new Date(repairDate) : null,
    repairNotes:     repairNotes     ?? null,
    repairStaff:     repairStaff     ?? null,
    repairAssistant: repairAssistant ?? null,
  });
};

// ── Update status & penanganan ────────────────────────────────────────
const updateComplaint = async (id, body, userId) => {
  const complaint = await repo.findById(id);
  if (!complaint) throw new AppError("Komplain tidak ditemukan", StatusCodes.NOT_FOUND);

  if (complaint.status === "CLOSED") {
    throw new AppError("Komplain sudah ditutup, tidak bisa diubah", StatusCodes.BAD_REQUEST);
  }

  const {
    status, handledBy,
    followUpDate, chatNotes,
    resolutionNotes, followUpAction,
    repairDate, repairNotes, repairStaff, repairAssistant,
    correctedStrands, totalStrands, commissionId,
  } = body;

  const data = {};

  if (status)          data.status    = status;
  if (handledBy)       data.handledBy = handledBy;

  // Follow up & komunikasi
  if (followUpDate !== undefined) data.followUpDate = followUpDate ? new Date(followUpDate) : null;
  if (chatNotes    !== undefined) data.chatNotes    = chatNotes    || null;

  // Resolusi
  if (resolutionNotes !== undefined) data.resolutionNotes = resolutionNotes || null;
  if (followUpAction  !== undefined) data.followUpAction  = followUpAction  || null;

  // Perbaikan
  if (repairDate      !== undefined) data.repairDate      = repairDate ? new Date(repairDate) : null;
  if (repairNotes     !== undefined) data.repairNotes     = repairNotes     || null;
  if (repairStaff     !== undefined) data.repairStaff     = repairStaff     || null;
  if (repairAssistant !== undefined) data.repairAssistant = repairAssistant || null;

  // Auto-set resolvedAt saat status → RESOLVED
  if (status === "RESOLVED" && complaint.status !== "RESOLVED") {
    data.resolvedAt = new Date();
  }

  // Pemotongan komisi — hanya saat RESOLVED
  if (status === "RESOLVED" && correctedStrands != null && totalStrands != null && commissionId) {
    const commission = await prisma.commission.findUnique({ where: { id: commissionId } });
    if (!commission) throw new AppError("Data komisi tidak ditemukan", StatusCodes.NOT_FOUND);

    const total    = Number(totalStrands);
    const fixed    = Number(correctedStrands);
    const ratio    = total > 0 ? fixed / total : 0;
    const deduction = D(commission.commissionAmount).mul(D(ratio)).toDecimalPlaces(2);

    data.correctedStrands          = fixed;
    data.totalStrands              = total;
    data.commissionId              = commissionId;
    data.commissionDeductionAmount = deduction;

    // Kurangi commissionAmount di Commission record
    const newAmount = D(commission.commissionAmount).sub(deduction);
    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        commissionAmount: newAmount.lessThan(0) ? 0 : newAmount,
        isManualOverride: true,
        overrideBy:       userId ?? null,
        overrideAt:       new Date(),
        overrideNotes:    `Potongan komplain ${complaint.complaintNo}: ${fixed} dari ${total} helaian diperbaiki`,
      },
    });
  }

  return repo.update(id, data);
};

// ── Delete ────────────────────────────────────────────────────────────
const deleteComplaint = async (id) => {
  const complaint = await repo.findById(id);
  if (!complaint) throw new AppError("Komplain tidak ditemukan", StatusCodes.NOT_FOUND);
  await repo.remove(id);
};

module.exports = { getStats, getAll, getById, create, updateComplaint, deleteComplaint };
