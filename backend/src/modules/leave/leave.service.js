const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");
const prisma          = require("../../config/prisma");
const repo            = require("./leave.repository");
const quotaSvc        = require("../leaveQuota/leaveQuota.service");

const ORDER_MAP = {
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  startDate:    { startDate: "asc" },
  "-startDate": { startDate: "desc" },
  status:       { status: "asc" },
  "-status":    { status: "desc" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDate = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// Generate array of UTC dates from startDate to endDate (inclusive)
const dateRange = (start, end) => {
  const dates = [];
  const curr  = new Date(start);
  const last  = new Date(end);
  while (curr <= last) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

// When leave is approved, upsert StaffSchedule entries for each day as LEAVE
// Accepts a transaction client so all upserts are part of the same atomic operation
const createLeaveSchedules = async (tx, employeeId, branchId, startDate, endDate) => {
  if (!branchId) return;
  const dates = dateRange(startDate, endDate);
  for (const workDate of dates) {
    await tx.staffSchedule.upsert({
      where:  { employeeId_branchId_workDate: { employeeId, branchId, workDate } },
      update: { status: "LEAVE" },
      create: { employeeId, branchId, workDate, status: "LEAVE", notes: "Cuti" },
    });
  }
};

// ── Service functions ─────────────────────────────────────────────────────────

const getAll = async ({ page, limit, employeeId, status, branchId, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (status)     where.status     = status;
  if (branchId) {
    where.employee = { homeBranchId: branchId };
  }

  const [rows, total] = await Promise.all([
    repo.findAll({ skip, take, where, orderBy }),
    repo.count(where),
  ]);
  return { data: rows, meta: paginationMeta(total, pageNum, limitNum) };
};

const getMy = async ({ employeeId, page, limit, status, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);
  const where = { employeeId };
  if (status) where.status = status;
  const [rows, total] = await Promise.all([
    repo.findAll({ skip, take, where, orderBy }),
    repo.count(where),
  ]);
  return { data: rows, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Leave not found", StatusCodes.NOT_FOUND);
  return leave;
};

const calcTotalDays = (start, end) => {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86400000) + 1;
};

const createLeave = async (employeeId, { startDate, endDate, reason, leaveTypeId }) => {
  if (!employeeId) throw new AppError("Employee not found for this user", StatusCodes.BAD_REQUEST);

  const start     = toDate(startDate);
  const end       = toDate(endDate);
  if (end < start) throw new AppError("End date must be after start date", StatusCodes.BAD_REQUEST);

  const totalDays = calcTotalDays(start, end);

  if (leaveTypeId) {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
      select: { quotaType: true },
    });
    if (!leaveType) throw new AppError("Tipe cuti tidak ditemukan", StatusCodes.NOT_FOUND);

    if (leaveType.quotaType === "ANNUAL") {
      const year    = start.getUTCFullYear();
      const balance = await quotaSvc.getBalance(employeeId, leaveTypeId, year);
      if (!balance) {
        throw new AppError(
          "Kuota cuti belum ditetapkan untuk tahun ini. Hubungi HRD.",
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }
      const remaining = balance.totalDays - balance.usedDays;
      if (totalDays > remaining)
        throw new AppError(
          `Sisa kuota cuti tidak cukup. Sisa: ${remaining} hari, dibutuhkan: ${totalDays} hari`,
          StatusCodes.BAD_REQUEST
        );
    }
  }

  return repo.create({
    employeeId,
    startDate: start,
    endDate:   end,
    reason:    reason ?? null,
    totalDays,
    status: "PENDING",
    ...(leaveTypeId ? { leaveTypeId } : {}),
  });
};

const approve = async (id, approvedBy) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Leave not found", StatusCodes.NOT_FOUND);
  if (leave.status !== "PENDING") throw new AppError("Only PENDING leaves can be approved", StatusCodes.BAD_REQUEST);

  const branchId = leave.employee?.homeBranch?.id ?? null;

  // Schedule upserts + status update in one transaction — partial failure won't leave ghost schedules
  await prisma.$transaction(async (tx) => {
    await createLeaveSchedules(tx, leave.employeeId, branchId, leave.startDate, leave.endDate);
    await tx.leave.update({ where: { id }, data: { status: "APPROVED", approvedBy, approvedAt: new Date() } });
  });

  // Quota increment is best-effort — quota errors must not block the approval
  if (leave.leaveTypeId && leave.totalDays && leave.leaveType?.quotaType === "ANNUAL") {
    const year = new Date(leave.startDate).getUTCFullYear();
    await quotaSvc.incrementUsed(leave.employeeId, leave.leaveTypeId, year, leave.totalDays).catch(() => null);
  }

  return repo.findById(id);
};

const reject = async (id, approvedBy) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Leave not found", StatusCodes.NOT_FOUND);
  if (leave.status !== "PENDING") throw new AppError("Only PENDING leaves can be rejected", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "REJECTED", approvedBy, approvedAt: new Date() });
};

const cancel = async (id, employeeId) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Leave not found", StatusCodes.NOT_FOUND);
  if (leave.employeeId !== employeeId) throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  if (leave.status !== "PENDING") throw new AppError("Only PENDING leaves can be cancelled", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "CANCELLED" });
};

module.exports = { getAll, getMy, getById, createLeave, approve, reject, cancel };
