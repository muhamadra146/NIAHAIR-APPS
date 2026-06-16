const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma  = require("../../config/prisma");
const repo    = require("./permission.repository");

const toDateOnly = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getAll = async ({ page = 1, limit = 20, employeeId, branchId, status }) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getMy = async ({ employeeId, page = 1, limit = 20, status }) => {
  if (!employeeId) throw new AppError("Employee not found", StatusCodes.BAD_REQUEST);
  const { skip, take } = paginate(page, limit);
  const where = { employeeId };
  if (status) where.status = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const p = await repo.findById(id);
  if (!p) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  return p;
};

const create = async (employeeId, branchId, { type, date, reason, notes, estimatedArrival }) => {
  if (!employeeId) throw new AppError("Employee not found", StatusCodes.BAD_REQUEST);

  const permType = type ?? "ABSENCE";
  const permDate = toDateOnly(date);

  // estimatedArrival required for LATE
  if (permType === "LATE" && !estimatedArrival) {
    throw new AppError("Estimasi jam datang wajib diisi untuk izin terlambat", StatusCodes.BAD_REQUEST);
  }

  // Resolve branchId: use provided, else employee's homeBranch
  let resolvedBranchId = branchId;
  if (!resolvedBranchId) {
    const emp = await prisma.employee.findUnique({
      where:  { id: employeeId },
      select: { homeBranchId: true },
    });
    resolvedBranchId = emp?.homeBranchId;
    if (!resolvedBranchId) throw new AppError("Branch tidak ditemukan", StatusCodes.BAD_REQUEST);
  }

  return repo.create({
    employeeId,
    branchId:         resolvedBranchId,
    type:             permType,
    date:             permDate,
    reason,
    notes:            notes ?? null,
    estimatedArrival: estimatedArrival ?? null,
    status:           "PENDING",
  });
};

const approve = async (id, reviewedBy, reviewNote) => {
  const perm = await repo.findById(id);
  if (!perm) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  if (perm.status !== "PENDING") throw new AppError("Hanya izin PENDING yang bisa disetujui", StatusCodes.BAD_REQUEST);

  // ABSENCE: mark schedule as IZIN (absent)
  // LATE: no schedule change — payroll will skip the late deduction for that date
  if (perm.type === "ABSENCE") {
    await prisma.staffSchedule.upsert({
      where:  { employeeId_branchId_workDate: { employeeId: perm.employeeId, branchId: perm.branchId, workDate: perm.date } },
      update: { status: "IZIN", notes: `Izin: ${perm.reason}` },
      create: { employeeId: perm.employeeId, branchId: perm.branchId, workDate: perm.date, status: "IZIN", notes: `Izin: ${perm.reason}` },
    });
  }

  return repo.update(id, {
    status:     "APPROVED",
    reviewedBy,
    reviewedAt: new Date(),
    reviewNote: reviewNote ?? null,
  });
};

const reject = async (id, reviewedBy, reviewNote) => {
  const perm = await repo.findById(id);
  if (!perm) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  if (perm.status !== "PENDING") throw new AppError("Hanya izin PENDING yang bisa ditolak", StatusCodes.BAD_REQUEST);

  return repo.update(id, {
    status:     "REJECTED",
    reviewedBy,
    reviewedAt: new Date(),
    reviewNote: reviewNote ?? null,
  });
};

const cancel = async (id, employeeId) => {
  const perm = await repo.findById(id);
  if (!perm) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  if (perm.employeeId !== employeeId) throw new AppError("Akses ditolak", StatusCodes.FORBIDDEN);
  if (perm.status !== "PENDING") throw new AppError("Hanya izin PENDING yang bisa dibatalkan", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "REJECTED" });
};

module.exports = { getAll, getMy, getById, create, approve, reject, cancel };
