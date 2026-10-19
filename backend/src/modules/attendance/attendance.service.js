const { StatusCodes }                    = require("http-status-codes");
const AppError                           = require("../../common/errors/AppError");
const { paginate, paginationMeta }       = require("../../utils/pagination");
const { toDateOnly, wibDateStr }         = require("../../utils/date");
const prisma                             = require("../../config/prisma");
const repo                               = require("./attendance.repository");
const settingRepo                        = require("../setting/setting.repository");
const divisionAccess                     = require("../division/division.access");
const { ROLES }                          = require("../../common/constants/role.constant");
const logger                            = require("../../utils/logger");

const GEOFENCE_EXEMPT_KEY = "attendance_geofence_exempt_employees";

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Pengaturan pengecualian geofence rusak (bukan JSON array) tidak boleh menggagalkan absen —
// dianggap kosong (semua karyawan tetap dicek lokasinya) dan dicatat di log.
const parseExemptList = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((e) => e && typeof e === "object");
  } catch { /* lanjut ke log di bawah */ }
  logger.warn("Setting attendance_geofence_exempt_employees tidak valid — dianggap kosong");
  return [];
};

const checkGeofence = async (branchId, employeeId, latitude, longitude) => {
  const [branch, exemptSetting] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId }, select: { latitude: true, longitude: true, radiusMeters: true } }),
    settingRepo.findByKey(GEOFENCE_EXEMPT_KEY),
  ]);
  if (!branch?.latitude || !branch?.longitude) return; // branch has no coordinates, allow
  // Format: [{employeeId, branchId}] — branchId null means exempt at all branches
  const exemptList = parseExemptList(exemptSetting?.value);
  const isExempt = exemptList.some(
    (e) => e.employeeId === employeeId && (e.branchId === null || e.branchId === branchId)
  );
  if (isExempt) return;
  // Cabang punya titik lokasi → GPS wajib (koordinat kosong/0 tidak lagi dianggap "tanpa GPS")
  const lat = Number(latitude), lng = Number(longitude);
  if (latitude == null || longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    throw new AppError("Lokasi (GPS) wajib aktif untuk absen di cabang ini", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  const dist = haversineMeters(
    Number(branch.latitude), Number(branch.longitude),
    Number(latitude), Number(longitude)
  );
  const radius = branch.radiusMeters ?? 100;
  if (dist > radius) {
    throw new AppError(
      `Lokasi terlalu jauh dari cabang (${Math.round(dist)}m, radius ${radius}m)`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

// BUG 2 FIX: Convert a UTC Date to WIB (UTC+7) minutes-since-midnight.
// Using .getHours() was returning UTC hours — a 09:30 WIB check-in (02:30 UTC)
// would give checkInMinutes=150, which is never > shiftStart+15=495, so nobody
// was ever marked LATE.
const toWIBMinutes = (dt) => {
  const wib = new Date(dt.getTime() + 7 * 3600 * 1000);
  return wib.getUTCHours() * 60 + wib.getUTCMinutes();
};

const computeStatus = (checkInAt, checkOutAt, shift) => {
  if (!checkInAt) return "ABSENT";

  const GRACE_MINUTES = 15;
  const checkInMinutes  = toWIBMinutes(checkInAt);
  const shiftStart      = parseTime(shift?.startTime);
  const shiftEnd        = parseTime(shift?.endTime);

  let lateMinutes       = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes   = 0;

  if (shiftStart !== null && checkInMinutes > shiftStart + GRACE_MINUTES) {
    lateMinutes = checkInMinutes - shiftStart;
  }

  if (checkOutAt && shiftEnd !== null) {
    const checkOutMinutes = toWIBMinutes(checkOutAt);
    if (checkOutMinutes < shiftEnd) {
      earlyLeaveMinutes = shiftEnd - checkOutMinutes;
    } else if (checkOutMinutes > shiftEnd) {
      overtimeMinutes = checkOutMinutes - shiftEnd;
    }
  }

  let status = "PRESENT";
  if (lateMinutes > GRACE_MINUTES) status = "LATE";

  const shiftDuration = shiftStart !== null && shiftEnd !== null
    ? shiftEnd - shiftStart
    : null;

  if (checkOutAt && shiftDuration && earlyLeaveMinutes > shiftDuration * 0.5) {
    status = "HALF_DAY";
  } else if (earlyLeaveMinutes > 0 && status === "PRESENT") {
    status = "EARLY_LEAVE";
  }

  return { status, lateMinutes, earlyLeaveMinutes, overtimeMinutes };
};

// ── Lingkup pantau (Kehadiran Tim, daftar & laporan) ────────────────────────
// Keputusan user 2026-10-19: Owner, Super Admin & Finance (proses gaji) melihat semua karyawan;
// role lain (manager divisi, Office, Manager) hanya rekan satu divisi di cabangnya (EMP-033,
// sama dengan aturan lihat jadwal). `user` kosong = panggilan internal, tidak dibatasi.
const MONITOR_ALL_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];

const monitorEmployeeWhere = async (user) => {
  if (!user || MONITOR_ALL_ROLES.includes(user.roleCode)) return null;
  return divisionAccess.visibleEmployeeWhere(user);
};

// Status jadwal = cuti / izin / sakit yang sudah disetujui (diisi modul leave/permission/sickLeave)
const APPROVED_ABSENCE_LABEL = { LEAVE: "cuti", IZIN: "izin", SAKIT: "sakit" };

// workDate (@db.Date) disimpan sebagai 00:00 UTC dari tanggal WIB → "YYYY-MM-DD"
const scheduleDateStr = (workDate) => new Date(workDate).toISOString().slice(0, 10);

// ── Get roster with attendance for a date/branch ─────────────────────────────

const getDailyRoster = async (branchId, date, user = null) => {
  const workDate      = toDateOnly(date);
  const employeeWhere = await monitorEmployeeWhere(user);
  const scope         = user ? await divisionAccess.getScope(user) : { all: true };
  const isPastOrToday = scheduleDateStr(workDate) <= wibDateStr();

  const schedules = await prisma.staffSchedule.findMany({
    where: { branchId, workDate, ...(employeeWhere && { employee: employeeWhere }) },
    include: {
      employee: {
        select: {
          id: true, name: true, employeeCode: true,
          divisionId: true, homeBranchId: true, isDivisionManager: true,
          role: { select: { id: true, code: true, name: true } },
        },
      },
      shift:      { select: { id: true, code: true, name: true, startTime: true, endTime: true, color: true } },
      attendance: true,
    },
    orderBy: { employee: { name: "asc" } },
  });

  return schedules.map((s) => {
    const { divisionId, homeBranchId, isDivisionManager, ...employee } = s.employee;
    return {
      scheduleId: s.id,
      employee,
      shift:      s.shift,
      status:     s.status,
      attendance: s.attendance ?? null,
      // Absensi Manual: manager divisi karyawan / Owner / SA, bukan tanggal depan, bukan hari cuti/izin/sakit
      canManualSet: isPastOrToday
        && !APPROVED_ABSENCE_LABEL[s.status]
        && divisionAccess.canManageTarget(scope, { id: s.employee.id, divisionId, homeBranchId, isDivisionManager }),
    };
  });
};

// ── List attendance ───────────────────────────────────────────────────────────

const getAll = async ({ page, limit, date, branchId, employeeId }, user = null) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (date)       where.workDate   = toDateOnly(date);
  if (branchId)   where.branchId   = branchId;
  if (employeeId) where.employeeId = employeeId;
  const employeeWhere = await monitorEmployeeWhere(user);
  if (employeeWhere) where.employee = employeeWhere;

  const [records, total] = await Promise.all([
    repo.findMany({ skip, take, where }),
    repo.count(where),
  ]);

  return { data: records, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id, user = null) => {
  const record = await repo.findById(id);
  if (!record) throw new AppError("Data absensi tidak ditemukan", StatusCodes.NOT_FOUND);
  const employeeWhere = await monitorEmployeeWhere(user);
  if (employeeWhere && (await repo.count({ id, employee: employeeWhere })) === 0) {
    throw new AppError("Anda tidak berhak melihat absensi karyawan ini", StatusCodes.FORBIDDEN);
  }
  return record;
};

// ── Check-in ──────────────────────────────────────────────────────────────────

/** Absen hanya untuk jadwal milik sendiri (bukan menitipkan absen ke rekan) */
const assertOwnSchedule = (schedule, actor) => {
  if (actor && schedule.employeeId !== actor.employeeId) {
    throw new AppError("Hanya bisa absen untuk jadwal sendiri", StatusCodes.FORBIDDEN);
  }
};

const checkIn = async ({ staffScheduleId, latitude, longitude, photoUrl, notes }, actor = null) => {
  const schedule = await prisma.staffSchedule.findUnique({
    where:   { id: staffScheduleId },
    include: { shift: true },
  });
  if (!schedule) throw new AppError("Jadwal tidak ditemukan", StatusCodes.NOT_FOUND);
  assertOwnSchedule(schedule, actor);

  // Absen masuk hanya pada tanggal jadwalnya (WIB) dan hanya sekali
  // workDate (@db.Date) disimpan sebagai 00:00 UTC dari tanggal WIB
  if (scheduleDateStr(schedule.workDate) !== wibDateStr(new Date())) {
    throw new AppError("Absen hanya bisa dilakukan pada tanggal jadwal", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  // Hari cuti / izin tidak masuk / sakit yang sudah disetujui → tidak bisa absen
  if (APPROVED_ABSENCE_LABEL[schedule.status]) {
    throw new AppError(
      `Tidak bisa absen: jadwal hari ini berstatus ${APPROVED_ABSENCE_LABEL[schedule.status]} (sudah disetujui)`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
  const existing = await repo.findBySchedule(staffScheduleId);
  if (existing?.checkInAt) throw new AppError("Sudah absen masuk untuk jadwal ini", StatusCodes.CONFLICT);

  await checkGeofence(schedule.branchId, schedule.employeeId, latitude, longitude);

  const now = new Date();
  const computed = computeStatus(now, null, schedule.shift);
  const { status, lateMinutes } = typeof computed === "object" ? computed : { status: computed, lateMinutes: 0 };

  return repo.upsertBySchedule(
    staffScheduleId,
    {
      staffScheduleId,
      employeeId:      schedule.employeeId,
      branchId:        schedule.branchId,
      workDate:        schedule.workDate,
      checkInAt:       now,
      checkInLatitude:  latitude  ?? null,
      checkInLongitude: longitude ?? null,
      checkInPhotoUrl:  photoUrl  ?? null,
      status,
      lateMinutes,
      isHolidayWork: schedule.status === "OFF",
      notes: notes ?? null,
      updatedAt: now,
    },
    {
      checkInAt:       now,
      checkInLatitude:  latitude  ?? null,
      checkInLongitude: longitude ?? null,
      checkInPhotoUrl:  photoUrl  ?? null,
      status,
      lateMinutes,
      isHolidayWork: schedule.status === "OFF",
      ...(notes != null && { notes }),
      updatedAt: now,
    },
  );
};

// ── Check-out ─────────────────────────────────────────────────────────────────

const checkOut = async ({ staffScheduleId, latitude, longitude, photoUrl, notes }, actor = null) => {
  const record = await repo.findBySchedule(staffScheduleId);
  if (!record)            throw new AppError("Belum ada absen masuk untuk jadwal ini", StatusCodes.BAD_REQUEST);
  if (actor && record.employeeId !== actor.employeeId) {
    throw new AppError("Hanya bisa absen untuk jadwal sendiri", StatusCodes.FORBIDDEN);
  }
  // Keputusan user 2026-10-19: absen keluar hanya pada tanggal jadwal (WIB) dan wajib di area cabang
  // (radius & pengecualian geofence sama dengan absen masuk)
  if (scheduleDateStr(record.staffSchedule?.workDate ?? record.workDate) !== wibDateStr(new Date())) {
    throw new AppError("Absen keluar hanya bisa dilakukan pada tanggal jadwal", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (!record.checkInAt)  throw new AppError("Belum absen masuk", StatusCodes.BAD_REQUEST);
  if (record.checkOutAt)  throw new AppError("Sudah absen keluar", StatusCodes.CONFLICT);

  await checkGeofence(record.staffSchedule?.branchId ?? record.branchId, record.employeeId, latitude, longitude);

  const now      = new Date();
  const computed = computeStatus(record.checkInAt, now, record.staffSchedule?.shift);
  const { status, lateMinutes, earlyLeaveMinutes, overtimeMinutes } =
    typeof computed === "object" ? computed : { status: computed, lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0 };

  return repo.update(record.id, {
    checkOutAt:       now,
    checkOutLatitude:  latitude  ?? null,
    checkOutLongitude: longitude ?? null,
    checkOutPhotoUrl:  photoUrl  ?? null,
    status,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    ...(notes != null && { notes }),
    updatedAt: now,
  });
};

// ── Admin: manual set attendance ──────────────────────────────────────────────
//
// Keputusan user 2026-10-19 (EMP-011):
//   · Hanya manager divisi karyawan (EMP-033) atau Owner / Super Admin. `actor` kosong =
//     panggilan internal (persetujuan Koreksi Jam Kerja — wewenang sudah dicek di sana).
//   · Bukan tanggal yang akan datang, bukan hari cuti / izin / sakit yang disetujui.
//   · Jam masuk / keluar harus pada tanggal jadwal (WIB); jam keluar setelah jam masuk.
//   · Status dihitung otomatis dari jam & shift (Hadir / Terlambat / Pulang Cepat / Setengah Hari).
//     Status manual hanya "ABSENT" (tanpa jam); status lain yang dikirim harus sama dengan hasil hitung.
//   · Jam yang tidak dikirim (undefined) tetap memakai nilai lama; null = dikosongkan.

const STATUS_LABEL = {
  PRESENT: "Hadir", LATE: "Terlambat", ABSENT: "Absen", HALF_DAY: "Setengah Hari", EARLY_LEAVE: "Pulang Cepat",
};

const parseOptionalDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return new Date(value);
};

const manualSet = async ({ staffScheduleId, status, checkInAt, checkOutAt, notes }, actor = null) => {
  const schedule = await prisma.staffSchedule.findUnique({
    where:   { id: staffScheduleId },
    include: { shift: true },
  });
  if (!schedule) throw new AppError("Jadwal tidak ditemukan", StatusCodes.NOT_FOUND);

  await divisionAccess.assertCanManage(actor, schedule.employeeId);

  // EMP-011: absensi manual tidak boleh tanpa alasan
  if (!notes || !String(notes).trim()) throw new AppError("Alasan absensi manual wajib diisi", StatusCodes.BAD_REQUEST);

  const workDateStr = scheduleDateStr(schedule.workDate);
  if (workDateStr > wibDateStr()) {
    throw new AppError("Absensi tidak bisa diisi untuk tanggal yang akan datang", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (APPROVED_ABSENCE_LABEL[schedule.status]) {
    throw new AppError(
      `Absensi tidak bisa diisi: karyawan ${APPROVED_ABSENCE_LABEL[schedule.status]} (sudah disetujui) pada tanggal ini`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const checkIn  = parseOptionalDate(checkInAt);
  const checkOut = parseOptionalDate(checkOutAt);
  if ((checkIn && Number.isNaN(checkIn.getTime())) || (checkOut && Number.isNaN(checkOut.getTime()))) {
    throw new AppError("Format jam masuk/keluar tidak valid", StatusCodes.BAD_REQUEST);
  }
  if ((checkIn && wibDateStr(checkIn) !== workDateStr) || (checkOut && wibDateStr(checkOut) !== workDateStr)) {
    throw new AppError(`Jam masuk/keluar harus pada tanggal jadwal (${workDateStr})`, StatusCodes.UNPROCESSABLE_ENTITY);
  }

  let effIn = null;
  let effOut = null;
  if (status === "ABSENT") {
    if (checkIn || checkOut) {
      throw new AppError("Status Absen tidak boleh disertai jam masuk/keluar", StatusCodes.UNPROCESSABLE_ENTITY);
    }
  } else {
    const existing = await repo.findBySchedule(staffScheduleId);
    effIn  = checkIn  !== undefined ? checkIn  : existing?.checkInAt  ?? null;
    effOut = checkOut !== undefined ? checkOut : existing?.checkOutAt ?? null;
    if (!effIn) {
      throw new AppError("Jam masuk wajib diisi (atau pilih status Absen)", StatusCodes.UNPROCESSABLE_ENTITY);
    }
    if (effOut && effOut <= effIn) {
      throw new AppError("Jam keluar harus setelah jam masuk", StatusCodes.BAD_REQUEST);
    }
  }

  const computed = effIn
    ? computeStatus(effIn, effOut, schedule.shift)
    : { status: "ABSENT", lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0 };
  if (status && status !== computed.status) {
    throw new AppError(
      `Status tidak sesuai jam: menurut jam & shift statusnya ${STATUS_LABEL[computed.status]}. Kosongkan status agar dihitung otomatis.`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const data = {
    checkInAt:         effIn,
    checkOutAt:        effOut,
    status:            computed.status,
    lateMinutes:       computed.lateMinutes,
    earlyLeaveMinutes: computed.earlyLeaveMinutes,
    overtimeMinutes:   computed.overtimeMinutes,
    isHolidayWork:     schedule.status === "OFF" && Boolean(effIn),
    notes:             String(notes).trim(),
    updatedAt:         new Date(),
  };

  return repo.upsertBySchedule(
    staffScheduleId,
    { staffScheduleId, employeeId: schedule.employeeId, branchId: schedule.branchId, workDate: schedule.workDate, ...data },
    data,
  );
};

// ── My today (self check-in view) ────────────────────────────────────────────

const getMyToday = async (employeeId) => {
  // BUG 3 FIX: setUTCHours(0,0,0,0) gives UTC midnight, which is 07:00 WIB.
  // Between WIB midnight and 07:00 the query would look at yesterday's schedule.
  // Solution: derive the WIB date (UTC+7) then build UTC midnight from those components.
  const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
  const today  = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()));

  const schedule = await prisma.staffSchedule.findFirst({
    where:   { employeeId, workDate: today },
    include: {
      shift:      { select: { id: true, code: true, name: true, startTime: true, endTime: true, color: true } },
      attendance: true,
    },
  });

  if (!schedule) return null;

  return {
    scheduleId: schedule.id,
    status:     schedule.status,
    notes:      schedule.notes,
    shift:      schedule.shift,
    attendance: schedule.attendance ?? null,
  };
};

// ── My history (paginated) ────────────────────────────────────────────────────

const getMy = async ({ employeeId, page, limit, month, year }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = { employeeId };
  if (month && year) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    where.workDate = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  }

  const [records, total] = await Promise.all([
    repo.findMany({ skip, take, where }),
    repo.count(where),
  ]);

  return { data: records, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Attendance report (per employee summary) ─────────────────────────────────

const getReport = async ({ branchId, startDate, endDate, employeeId }, user = null) => {
  if (!branchId)             throw new AppError("Cabang wajib dipilih", StatusCodes.BAD_REQUEST);
  if (!startDate || !endDate) throw new AppError("Tanggal mulai dan tanggal selesai wajib diisi", StatusCodes.BAD_REQUEST);

  const start = toDateOnly(startDate);
  const end   = toDateOnly(endDate);
  if (end < start) throw new AppError("Tanggal selesai harus setelah tanggal mulai", StatusCodes.BAD_REQUEST);

  const employeeWhere = await monitorEmployeeWhere(user);
  const schedules = await repo.getReportData({ branchId, startDate: start, endDate: end, employeeId, employeeWhere });
  const todayStr  = wibDateStr();

  const byEmployee = {};

  for (const sc of schedules) {
    const eid = sc.employeeId;
    if (!byEmployee[eid]) {
      byEmployee[eid] = {
        employee:          sc.employee,
        scheduledDays:     0,
        presentDays:       0,
        absentDays:        0,
        lateDays:          0,
        earlyLeaveDays:    0,
        halfDays:          0,
        lateMinutes:       0,
        earlyLeaveMinutes: 0,
        overtimeMinutes:   0,
        holidayWorkDays:   0,
        // BUG 1+2 FIX: approved-absence breakdown (LEAVE/IZIN/SAKIT)
        leaveDays:  0,
        izinDays:   0,
        sakitDays:  0,
      };
    }
    const r   = byEmployee[eid];
    const att = sc.attendance;

    // BUG 1 FIX: Approved absences — count separately, NOT as scheduledDays or absentDays.
    // Previously all statuses (LEAVE, IZIN, SAKIT, OFF) fell through to scheduledDays++
    // and — when no attendance record — to absentDays++. That inflated both counters.
    if (sc.status === "LEAVE") { r.leaveDays++;  continue; }
    if (sc.status === "IZIN")  { r.izinDays++;   continue; }
    if (sc.status === "SAKIT") { r.sakitDays++;  continue; }

    // BUG 2 FIX: OFF (rest day) — not a scheduled work day.
    // Count holiday work minutes/days but do NOT add to scheduledDays.
    if (sc.status === "OFF") {
      if (att && att.isHolidayWork) {
        r.holidayWorkDays++;
        r.lateMinutes       += att.lateMinutes       ?? 0;
        r.earlyLeaveMinutes += att.earlyLeaveMinutes ?? 0;
        r.overtimeMinutes   += att.overtimeMinutes   ?? 0;
      }
      continue;
    }

    // Hari kerja setelah hari ini (WIB) yang belum ada absensinya belum terjadi →
    // tidak dihitung hari terjadwal maupun Absen
    if (!att && scheduleDateStr(sc.workDate) > todayStr) continue;

    // WORKING day — normal scheduled day
    r.scheduledDays++;
    if (!att || att.status === "ABSENT") {
      r.absentDays++;
    } else {
      r.presentDays++;
      if (att.status === "LATE")        r.lateDays++;
      if (att.status === "EARLY_LEAVE") r.earlyLeaveDays++;
      if (att.status === "HALF_DAY")    r.halfDays++;
      r.lateMinutes       += att.lateMinutes       ?? 0;
      r.earlyLeaveMinutes += att.earlyLeaveMinutes ?? 0;
      r.overtimeMinutes   += att.overtimeMinutes   ?? 0;
      if (att.isHolidayWork) r.holidayWorkDays++;
    }
  }

  // Exclude employees who were entirely on approved leave (LEAVE/IZIN/SAKIT)
  // with no WORKING days and no holiday work in this period — their attendance
  // rate would be a misleading 0% even though they were legitimately absent.
  const rows = Object.values(byEmployee)
    .filter((r) => r.scheduledDays > 0 || r.holidayWorkDays > 0)
    .map((r) => ({
      ...r,
      attendanceRate: r.scheduledDays > 0
        ? Math.round((r.presentDays / r.scheduledDays) * 1000) / 10
        : 0,
    }));

  rows.sort((a, b) => a.employee.name.localeCompare(b.employee.name, "id-ID"));

  return { data: rows, period: { startDate: start, endDate: end } };
};

// Karyawan yang hadir (PRESENT / LATE / EARLY_LEAVE / HALF_DAY) di cabang & tanggal tertentu.
// Dipakai Input Pekerjaan untuk kategori komisi "staf bisa dipilih bebas" (Charge Lembur).
const PRESENT_STATUSES = ["PRESENT", "LATE", "EARLY_LEAVE", "HALF_DAY"];
const getPresentEmployees = async ({ branchId, date }) => {
  if (!branchId || !date) throw new AppError("branchId dan date wajib diisi", StatusCodes.BAD_REQUEST);
  const rows = await repo.findPresentEmployees(branchId, toDateOnly(date), PRESENT_STATUSES);
  return [...new Map(rows.map((r) => [r.employee.id, r.employee])).values()];
};

module.exports = { getDailyRoster, getAll, getById, checkIn, checkOut, manualSet, getMyToday, getMy, getReport, getPresentEmployees };
