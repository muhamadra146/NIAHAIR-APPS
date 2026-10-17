const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma  = require("../../config/prisma");
const repo    = require("./permission.repository");
const divisionAccess = require("../division/division.access");
const { assertNoOverlappingRequest } = require("../leave/leave.overlap");

const toDateOnly = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getAll = async ({ page = 1, limit = 20, employeeId, branchId, status }, scope = null) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  // Batas wewenang divisi (manager divisi: staf satu divisi & cabang; Owner/SA: semua)
  if (scope && !scope.all) where.employee = { ...(where.employee ?? {}), ...divisionAccess.managedEmployeeWhere(scope) };
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getMy = async ({ employeeId, page = 1, limit = 20, status }) => {
  if (!employeeId) throw new AppError("Karyawan tidak ditemukan", StatusCodes.BAD_REQUEST);
  const { skip, take } = paginate(page, limit);
  const where = { employeeId };
  if (status) where.status = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getById = async (id, actor = null) => {
  const p = await repo.findById(id);
  if (!p) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanView(actor, p.employeeId);
  return p;
};

const create = async (employeeId, branchId, { type, date, reason, notes, estimatedArrival }) => {
  if (!employeeId) throw new AppError("Karyawan tidak ditemukan", StatusCodes.BAD_REQUEST);

  const permType = type ?? "ABSENCE";
  const permDate = toDateOnly(date);
  if (Number.isNaN(permDate.getTime())) throw new AppError("Tanggal tidak valid", StatusCodes.BAD_REQUEST);

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

  // Tidak boleh bertabrakan dengan cuti / izin / sakit lain yang menunggu atau disetujui
  await assertNoOverlappingRequest(employeeId, permDate, permDate);

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

const approve = async (id, reviewedBy, reviewNote, actor = null) => {
  const perm = await repo.findById(id);
  if (!perm) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanManage(actor, perm.employeeId);
  if (perm.status !== "PENDING") throw new AppError("Hanya izin PENDING yang bisa disetujui", StatusCodes.BAD_REQUEST);

  // ABSENCE: mark schedule as IZIN (absent)
  // LATE: no schedule change — payroll will skip the late deduction for that date
  // Schedule upsert + status update in one transaction — prevents ghost schedule if status update fails
  await prisma.$transaction(async (tx) => {
    if (perm.type === "ABSENCE") {
      await tx.staffSchedule.upsert({
        where:  { employeeId_branchId_workDate: { employeeId: perm.employeeId, branchId: perm.branchId, workDate: perm.date } },
        update: { status: "IZIN", notes: `Izin: ${perm.reason}` },
        create: { employeeId: perm.employeeId, branchId: perm.branchId, workDate: perm.date, status: "IZIN", notes: `Izin: ${perm.reason}` },
      });
    }
    await tx.permissionRequest.update({
      where: { id },
      data:  { status: "APPROVED", reviewedBy, reviewedAt: new Date(), reviewNote: reviewNote ?? null },
    });
  });

  return repo.findById(id);
};

const reject = async (id, reviewedBy, reviewNote, actor = null) => {
  const perm = await repo.findById(id);
  if (!perm) throw new AppError("Izin tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanManage(actor, perm.employeeId);
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

// ── Notifikasi (lihat notification.service) ─────────────────────────
const notification = require("../notification/notification.service");
const _tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const createNotify = async (...args) => {
  const r = await create(...args);
  await notification.requestCreated("PERMISSION", { employeeId: r.employeeId, detail: r.type === "LATE" ? `terlambat, ${_tgl(r.date)}` : `tidak masuk, ${_tgl(r.date)}` });
  return r;
};
const approveNotify = async (id, reviewedBy, reviewNote, actor) => {
  const r = await approve(id, reviewedBy, reviewNote, actor);
  await notification.requestDecided("PERMISSION", { employeeId: r.employeeId, approved: true, note: reviewNote });
  return r;
};
const rejectNotify = async (id, reviewedBy, reviewNote, actor) => {
  const r = await reject(id, reviewedBy, reviewNote, actor);
  await notification.requestDecided("PERMISSION", { employeeId: r.employeeId, approved: false, note: reviewNote });
  return r;
};

module.exports = { getAll, getMy, getById, create: createNotify, approve: approveNotify, reject: rejectNotify, cancel };
