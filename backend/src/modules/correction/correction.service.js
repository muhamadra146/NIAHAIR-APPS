const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo = require("./correction.repository");
const divisionAccess = require("../division/division.access");
const attendanceSvc = require("../attendance/attendance.service");

const getAll = async ({ page, limit, branchId, status, employeeId }, scope = null) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = {};
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  if (employeeId) where.employeeId = employeeId;
  // Batas wewenang divisi (manager divisi: staf satu divisi & cabang; Owner/SA: semua)
  if (scope && !scope.all) where.employee = { ...(where.employee ?? {}), ...divisionAccess.managedEmployeeWhere(scope) };

  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, pageNum, limitNum) };
};

const getMy = async ({ employeeId, page, limit, status }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = { employeeId };
  if (status) where.status = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id, actor = null) => {
  const cr = await repo.findById(id);
  if (!cr) throw new AppError("Pengajuan koreksi tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanView(actor, cr.employeeId);
  return cr;
};

const create = async (employeeId, branchId, { staffScheduleId, attendanceId, requestedCheckIn, requestedCheckOut, reason, branchId: bodyBranchId }) => {
  const resolvedBranchId = branchId ?? bodyBranchId;
  if (!employeeId)       throw new AppError("Data karyawan untuk user ini tidak ditemukan", StatusCodes.BAD_REQUEST);
  if (!resolvedBranchId) throw new AppError("Cabang karyawan tidak ditemukan", StatusCodes.BAD_REQUEST);
  if (!staffScheduleId)  throw new AppError("Jadwal wajib dipilih", StatusCodes.BAD_REQUEST);
  reason = typeof reason === "string" ? reason.trim() : reason;
  if (!reason)           throw new AppError("Alasan wajib diisi", StatusCodes.BAD_REQUEST);
  if (!requestedCheckIn && !requestedCheckOut)
    throw new AppError("Isi minimal jam masuk atau jam keluar yang dikoreksi", StatusCodes.BAD_REQUEST);
  if (requestedCheckIn && requestedCheckOut && new Date(requestedCheckOut) <= new Date(requestedCheckIn))
    throw new AppError("Jam keluar harus setelah jam masuk", StatusCodes.BAD_REQUEST);

  // Koreksi hanya untuk jadwal & absensi milik sendiri (bukan menimpa absensi rekan)
  const schedule = await repo.findScheduleOwner(staffScheduleId);
  if (!schedule) throw new AppError("Jadwal tidak ditemukan", StatusCodes.NOT_FOUND);
  if (schedule.employeeId !== employeeId)
    throw new AppError("Hanya bisa mengajukan koreksi untuk jadwal sendiri", StatusCodes.FORBIDDEN);
  if (attendanceId) {
    const att = await repo.findAttendanceSchedule(attendanceId);
    if (!att || att.staffScheduleId !== staffScheduleId)
      throw new AppError("Data absensi tidak sesuai dengan jadwal", StatusCodes.BAD_REQUEST);
  }

  return repo.create({
    employeeId,
    branchId: resolvedBranchId,
    staffScheduleId,
    attendanceId:       attendanceId ?? null,
    requestedCheckIn:   requestedCheckIn  ? new Date(requestedCheckIn)  : null,
    requestedCheckOut:  requestedCheckOut ? new Date(requestedCheckOut) : null,
    reason,
    status: "PENDING",
  });
};

const review = async (id, reviewerId, { status, reviewNote }, actor = null) => {
  const cr = await repo.findById(id);
  if (!cr) throw new AppError("Pengajuan koreksi tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanManage(actor, cr.employeeId);
  if (cr.status !== "PENDING") throw new AppError("Hanya pengajuan berstatus PENDING yang bisa diproses", StatusCodes.BAD_REQUEST);
  if (!["APPROVED", "REJECTED"].includes(status))
    throw new AppError("Status harus APPROVED atau REJECTED", StatusCodes.BAD_REQUEST);

  // Disetujui: terapkan jam koreksi ke absensi DULU — bila gagal, status tetap PENDING.
  // Hanya jam yang dikoreksi yang diubah (jam lain tetap); alasan koreksi jadi catatan absensi
  // (EMP-011). Tanpa actor: wewenang penyetuju sudah dicek di atas.
  if (status === "APPROVED" && cr.staffScheduleId) {
    await attendanceSvc.manualSet({
      staffScheduleId: cr.staffScheduleId,
      checkInAt:  cr.requestedCheckIn  ? new Date(cr.requestedCheckIn).toISOString()  : undefined,
      checkOutAt: cr.requestedCheckOut ? new Date(cr.requestedCheckOut).toISOString() : undefined,
      notes:      `Koreksi disetujui: ${String(cr.reason ?? "").trim() || "-"}`,
    });
  }

  return repo.update(id, {
    status,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    reviewNote: reviewNote ?? null,
  });
};

// ── Notifikasi (lihat notification.service) ─────────────────────────
const notification = require("../notification/notification.service");

const createNotify = async (...args) => {
  const r = await create(...args);
  await notification.requestCreated("CORRECTION", { employeeId: r.employeeId });
  return r;
};
const reviewNotify = async (id, reviewerId, body, actor) => {
  const r = await review(id, reviewerId, body, actor);
  await notification.requestDecided("CORRECTION", { employeeId: r.employeeId, approved: body.status === "APPROVED", note: body.reviewNote });
  return r;
};

module.exports = { getAll, getMy, getById, create: createNotify, review: reviewNotify };
