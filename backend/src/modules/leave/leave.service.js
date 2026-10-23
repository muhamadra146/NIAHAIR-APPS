const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");
const prisma          = require("../../config/prisma");
const repo            = require("./leave.repository");
const quotaSvc        = require("../leaveQuota/leaveQuota.service");
const divisionAccess = require("../division/division.access");
const { assertNoOverlappingRequest } = require("./leave.overlap");
const { countWorkingDays, isOffSchedule, rangeDates, dateKey } = require("./leave.workdays");
const { toDateOnly } = require("../../utils/date");

const ORDER_MAP = {
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  startDate:    { startDate: "asc" },
  "-startDate": { startDate: "desc" },
  status:       { status: "asc" },
  "-status":    { status: "desc" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Catatan baris jadwal yang DIBUAT oleh persetujuan cuti (bukan jadwal yang sudah ada sebelumnya)
const LEAVE_CREATED_NOTE = "Cuti";

/**
 * Saat cuti disetujui, tandai hari-hari cuti di jadwal sebagai LEAVE (dalam transaksi).
 *   · Hari OFF (status OFF / shift tanpa jam) dibiarkan OFF — tidak memakai jatah.
 *   · Jadwal yang sudah ada → status LEAVE (shift & catatan lama disimpan agar bisa
 *     dipulihkan bila cuti dibatalkan).
 *   · Tanggal tanpa jadwal → dibuat baris LEAVE di cabang utama, catatan "Cuti".
 */
const markLeaveSchedules = async (tx, employeeId, branchId, startDate, endDate, schedules) => {
  const byDate = new Map();
  for (const sc of schedules ?? []) {
    const k = dateKey(sc.workDate);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k).push(sc);
  }
  for (const k of rangeDates(startDate, endDate)) {
    const rows = byDate.get(k) ?? [];
    if (rows.some(isOffSchedule)) continue;
    if (rows.length > 0) {
      for (const sc of rows) {
        if (sc.status !== "LEAVE") await tx.staffSchedule.update({ where: { id: sc.id }, data: { status: "LEAVE" } });
      }
    } else if (branchId) {
      await tx.staffSchedule.create({
        data: { employeeId, branchId, workDate: new Date(`${k}T00:00:00.000Z`), status: "LEAVE", notes: LEAVE_CREATED_NOTE },
      });
    }
  }
};

/**
 * Status jadwal sesudah cuti dibatalkan (null = hapus baris).
 *   · baris punya shift → shift berjam = WORKING, shift tanpa jam = OFF (shift lama tetap tersimpan)
 *   · baris tanpa shift → dibuat oleh persetujuan cuti / tidak bisa dipulihkan → dihapus
 *     (tanpa jadwal = hari kerja, sejalan payroll; manager bisa mengisi ulang di roster)
 */
const restoredScheduleStatus = (sc) => {
  if (!sc.shiftId) return null;
  return sc.shift && !sc.shift.startTime ? "OFF" : "WORKING";
};

// ── Service functions ─────────────────────────────────────────────────────────

const getAll = async ({ page, limit, employeeId, status, branchId, sortBy }, scope = null) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (status)     where.status     = status;
  if (branchId) {
    where.employee = { homeBranchId: branchId };
  }
  // Batas wewenang divisi (manager divisi: staf satu divisi & cabang; Owner/SA: semua)
  if (scope && !scope.all) where.employee = { ...(where.employee ?? {}), ...divisionAccess.managedEmployeeWhere(scope) };

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

const getById = async (id, actor = null) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Cuti tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanView(actor, leave.employeeId);
  return leave;
};

/** Validasi & normalisasi rentang tanggal cuti ("YYYY-MM-DD", tanggal mustahil → 400) */
const parseRange = (startDate, endDate) => {
  const start = toDateOnly(startDate);
  const end   = toDateOnly(endDate);
  if (end < start) throw new AppError("Tanggal selesai harus setelah tanggal mulai", StatusCodes.BAD_REQUEST);
  return { start, end };
};

/** Pratinjau durasi cuti dalam hari kerja (form pengajuan) */
const previewWorkingDays = async (employeeId, { startDate, endDate } = {}) => {
  if (!employeeId) throw new AppError("Data karyawan untuk user ini tidak ditemukan", StatusCodes.BAD_REQUEST);
  if (!startDate || !endDate) throw new AppError("Tanggal mulai dan selesai wajib diisi", StatusCodes.BAD_REQUEST);
  const { start, end } = parseRange(startDate, endDate);
  if (Math.round((end - start) / 86400000) > 366) throw new AppError("Rentang cuti maksimal 1 tahun", StatusCodes.BAD_REQUEST);
  const { totalDays, calendarDays, offDays, holidayDays } = await countWorkingDays(employeeId, start, end);
  return { totalDays, calendarDays, offDays, holidayDays };
};

const createLeave = async (employeeId, { startDate, endDate, reason, leaveTypeId }) => {
  if (!employeeId) throw new AppError("Data karyawan untuk user ini tidak ditemukan", StatusCodes.BAD_REQUEST);

  const { start, end } = parseRange(startDate, endDate);

  // Cuti tidak boleh berlaku mundur: mulai hari ini (WIB) atau sesudahnya (keputusan user 2026-10-19)
  if (start < toDateOnly()) {
    throw new AppError("Cuti hanya bisa diajukan mulai hari ini atau tanggal setelahnya", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Jenis cuti wajib (keputusan user 2026-10-15) — jatah cuti selalu terpotong dari jenis yang dipilih
  if (!leaveTypeId) throw new AppError("Jenis cuti wajib dipilih", StatusCodes.BAD_REQUEST);

  // Durasi = hari kerja: hari OFF & libur nasional tidak memakai jatah (keputusan user 2026-10-19)
  const { totalDays } = await countWorkingDays(employeeId, start, end);
  if (totalDays <= 0) {
    throw new AppError(
      "Semua tanggal yang dipilih adalah hari OFF / libur nasional — tidak ada hari kerja yang perlu diajukan cuti",
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  {
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
      // Sisa sudah dikurangi pengajuan lain yang masih menunggu persetujuan
      const remaining = balance.remainingDays ?? (balance.totalDays - balance.usedDays);
      if (totalDays > remaining)
        throw new AppError(
          `Sisa kuota cuti tidak cukup. Sisa: ${remaining} hari${balance.pendingDays ? ` (${balance.pendingDays} hari masih menunggu persetujuan)` : ""}, dibutuhkan: ${totalDays} hari kerja`,
          StatusCodes.BAD_REQUEST
        );
    }
  }

  // Tidak boleh bertabrakan dengan cuti / izin / sakit lain yang menunggu atau disetujui
  await assertNoOverlappingRequest(employeeId, start, end);

  return repo.create({
    employeeId,
    startDate: start,
    endDate:   end,
    reason:    reason ?? null,
    totalDays,
    status: "PENDING",
    leaveTypeId,
  });
};

const approve = async (id, approvedBy, actor = null) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Cuti tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanManage(actor, leave.employeeId);
  if (leave.status !== "PENDING") throw new AppError("Hanya cuti berstatus PENDING yang bisa disetujui", StatusCodes.BAD_REQUEST);

  const branchId = leave.employee?.homeBranch?.id ?? null;

  // Hitung ulang hari kerja dengan jadwal terbaru (jadwal bisa berubah sejak diajukan);
  // nilai ini yang menambah "terpakai" dan dikembalikan bila cuti dibatalkan.
  const { totalDays, schedules } = await countWorkingDays(leave.employeeId, leave.startDate, leave.endDate);

  // Jadwal + status dalam satu transaksi — gagal sebagian tidak meninggalkan jadwal LEAVE yatim
  await prisma.$transaction(async (tx) => {
    await markLeaveSchedules(tx, leave.employeeId, branchId, leave.startDate, leave.endDate, schedules);
    await tx.leave.update({ where: { id }, data: { status: "APPROVED", approvedBy, approvedAt: new Date(), totalDays } });
  });

  // Penambahan terpakai best-effort — galat kuota tidak menggagalkan persetujuan
  if (leave.leaveTypeId && totalDays > 0 && leave.leaveType?.quotaType === "ANNUAL") {
    const year = new Date(leave.startDate).getUTCFullYear();
    await quotaSvc.incrementUsed(leave.employeeId, leave.leaveTypeId, year, totalDays).catch(() => null);
  }

  return repo.findById(id);
};

const reject = async (id, approvedBy, actor = null) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Cuti tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanManage(actor, leave.employeeId);
  if (leave.status !== "PENDING") throw new AppError("Hanya cuti berstatus PENDING yang bisa ditolak", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "REJECTED", approvedBy, approvedAt: new Date() });
};

// Karyawan membatalkan pengajuannya sendiri yang masih menunggu
const cancel = async (id, employeeId) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Cuti tidak ditemukan", StatusCodes.NOT_FOUND);
  if (leave.employeeId !== employeeId) throw new AppError("Akses ditolak", StatusCodes.FORBIDDEN);
  if (leave.status !== "PENDING") throw new AppError("Hanya cuti berstatus PENDING yang bisa dibatalkan", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "CANCELLED" });
};

/**
 * Batalkan cuti yang SUDAH DISETUJUI (keputusan user 2026-10-19).
 *   · Oleh Owner / Super Admin / manager divisi (sesuai wewenang divisi).
 *   · Hanya bila cuti belum dimulai (tanggal mulai ≥ hari ini WIB).
 *   · Status → CANCELLED, jatah dikembalikan (terpakai − totalDays hari kerja),
 *     jadwal LEAVE dipulihkan (lihat restoredScheduleStatus), karyawan diberi notifikasi.
 */
const cancelApproved = async (id, actor = null) => {
  const leave = await repo.findById(id);
  if (!leave) throw new AppError("Cuti tidak ditemukan", StatusCodes.NOT_FOUND);
  await divisionAccess.assertCanManage(actor, leave.employeeId);
  if (leave.status !== "APPROVED") throw new AppError("Hanya cuti yang sudah disetujui yang bisa dibatalkan di sini", StatusCodes.BAD_REQUEST);
  if (new Date(leave.startDate) < toDateOnly()) {
    throw new AppError("Cuti yang sudah dimulai atau sudah lewat tidak bisa dibatalkan", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const restored = { working: 0, off: 0, removed: 0 };
  await prisma.$transaction(async (tx) => {
    const schedules = (await repo.findSchedulesInRange(leave.employeeId, leave.startDate, leave.endDate, tx)) ?? [];
    for (const sc of schedules.filter((s) => s.status === "LEAVE")) {
      const status = restoredScheduleStatus(sc);
      if (status === null && !sc.attendance) {
        await tx.staffSchedule.delete({ where: { id: sc.id } });
        restored.removed++;
      } else {
        await tx.staffSchedule.update({ where: { id: sc.id }, data: { status: status ?? "OFF" } });
        if (status === "WORKING") restored.working++; else restored.off++;
      }
    }
    await tx.leave.update({ where: { id }, data: { status: "CANCELLED" } });
  });

  if (leave.leaveTypeId && leave.totalDays && leave.leaveType?.quotaType === "ANNUAL") {
    const year = new Date(leave.startDate).getUTCFullYear();
    await quotaSvc.decrementUsed(leave.employeeId, leave.leaveTypeId, year, leave.totalDays).catch(() => null);
  }

  const updated = await repo.findById(id);
  return { ...updated, restoredSchedules: restored };
};

// ── Notifikasi (lihat notification.service) ─────────────────────────
const notification = require("../notification/notification.service");
const _tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const _range = (l) => (new Date(l.startDate).getTime() === new Date(l.endDate).getTime()
  ? _tgl(l.startDate)
  : `${_tgl(l.startDate)} – ${_tgl(l.endDate)}`);
const _detail = (l) => `${_range(l)}, ${l.totalDays} hari kerja`;

const createLeaveNotify = async (...args) => {
  const leave = await createLeave(...args);
  await notification.requestCreated("LEAVE", { employeeId: leave.employeeId, detail: _detail(leave) });
  return leave;
};
const approveNotify = async (...args) => {
  const leave = await approve(...args);
  await notification.requestDecided("LEAVE", { employeeId: leave.employeeId, approved: true, detail: _detail(leave) });
  return leave;
};
const rejectNotify = async (...args) => {
  const leave = await reject(...args);
  await notification.requestDecided("LEAVE", { employeeId: leave.employeeId, approved: false, detail: _detail(leave) });
  return leave;
};
// Pengajuan dibatalkan → notifikasi "menunggu persetujuan" milik penyetuju diperbarui
const cancelNotify = async (...args) => {
  const leave = await cancel(...args);
  await notification.requestCancelled("LEAVE", { employeeId: leave.employeeId, detail: _range(leave), since: leave.createdAt });
  return leave;
};
const cancelApprovedNotify = async (...args) => {
  const leave = await cancelApproved(...args);
  await notification.requestRevoked("LEAVE", {
    employeeId: leave.employeeId,
    detail:     _detail(leave),
    note:       leave.totalDays && leave.leaveType?.quotaType === "ANNUAL" ? `Jatah ${leave.totalDays} hari dikembalikan.` : "",
  });
  return leave;
};

module.exports = {
  getAll, getMy, getById, previewWorkingDays,
  createLeave: createLeaveNotify, approve: approveNotify, reject: rejectNotify,
  cancel: cancelNotify, cancelApproved: cancelApprovedNotify,
};
