const { StatusCodes }                    = require("http-status-codes");
const AppError                           = require("../../common/errors/AppError");
const { paginate, paginationMeta }       = require("../../utils/pagination");
const prisma                             = require("../../config/prisma");
const repo                               = require("./attendance.repository");

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const computeStatus = (checkInAt, checkOutAt, shift) => {
  if (!checkInAt) return "ABSENT";

  const GRACE_MINUTES = 15;
  const checkInMinutes  = checkInAt.getHours() * 60 + checkInAt.getMinutes();
  const shiftStart      = parseTime(shift?.startTime);
  const shiftEnd        = parseTime(shift?.endTime);

  let lateMinutes       = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes   = 0;

  if (shiftStart !== null && checkInMinutes > shiftStart + GRACE_MINUTES) {
    lateMinutes = checkInMinutes - shiftStart;
  }

  if (checkOutAt && shiftEnd !== null) {
    const checkOutMinutes = checkOutAt.getHours() * 60 + checkOutAt.getMinutes();
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

// ── Get roster with attendance for a date/branch ─────────────────────────────

const getDailyRoster = async (branchId, date) => {
  const workDate = new Date(date);
  workDate.setUTCHours(0, 0, 0, 0);

  const schedules = await prisma.staffSchedule.findMany({
    where: { branchId, workDate },
    include: {
      employee: {
        select: { id: true, name: true, employeeCode: true, role: { select: { id: true, code: true, name: true } } },
      },
      shift:      { select: { id: true, code: true, name: true, startTime: true, endTime: true, color: true } },
      attendance: true,
    },
    orderBy: { employee: { name: "asc" } },
  });

  return schedules.map((s) => ({
    scheduleId: s.id,
    employee:   s.employee,
    shift:      s.shift,
    status:     s.status,
    attendance: s.attendance ?? null,
  }));
};

// ── List attendance ───────────────────────────────────────────────────────────

const getAll = async ({ page, limit, date, branchId, employeeId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (date)       where.workDate   = new Date(date);
  if (branchId)   where.branchId   = branchId;
  if (employeeId) where.employeeId = employeeId;

  const [records, total] = await Promise.all([
    repo.findMany({ skip, take, where }),
    repo.count(where),
  ]);

  return { data: records, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const record = await repo.findById(id);
  if (!record) throw new AppError("Attendance record not found", StatusCodes.NOT_FOUND);
  return record;
};

// ── Check-in ──────────────────────────────────────────────────────────────────

const checkIn = async ({ staffScheduleId, latitude, longitude, photoUrl, notes }) => {
  const schedule = await prisma.staffSchedule.findUnique({
    where:   { id: staffScheduleId },
    include: { shift: true },
  });
  if (!schedule) throw new AppError("Schedule not found", StatusCodes.NOT_FOUND);

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

const checkOut = async ({ staffScheduleId, latitude, longitude, photoUrl, notes }) => {
  const record = await repo.findBySchedule(staffScheduleId);
  if (!record)            throw new AppError("No check-in found for this schedule", StatusCodes.BAD_REQUEST);
  if (!record.checkInAt)  throw new AppError("Not checked in yet", StatusCodes.BAD_REQUEST);
  if (record.checkOutAt)  throw new AppError("Already checked out", StatusCodes.CONFLICT);

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

const manualSet = async ({ staffScheduleId, status, checkInAt, checkOutAt, notes }) => {
  const schedule = await prisma.staffSchedule.findUnique({
    where:   { id: staffScheduleId },
    include: { shift: true },
  });
  if (!schedule) throw new AppError("Schedule not found", StatusCodes.NOT_FOUND);

  const checkIn  = checkInAt  ? new Date(checkInAt)  : null;
  const checkOut = checkOutAt ? new Date(checkOutAt) : null;

  const computed = computeStatus(checkIn, checkOut, schedule.shift);
  const resolvedStatus  = status ?? (typeof computed === "object" ? computed.status : computed);
  const lateMinutes     = typeof computed === "object" ? computed.lateMinutes       : 0;
  const earlyLeaveMin   = typeof computed === "object" ? computed.earlyLeaveMinutes : 0;
  const overtimeMin     = typeof computed === "object" ? computed.overtimeMinutes   : 0;
  const now = new Date();

  return repo.upsertBySchedule(
    staffScheduleId,
    {
      staffScheduleId,
      employeeId:    schedule.employeeId,
      branchId:      schedule.branchId,
      workDate:      schedule.workDate,
      checkInAt:     checkIn,
      checkOutAt:    checkOut,
      status:        resolvedStatus,
      lateMinutes,
      earlyLeaveMinutes: earlyLeaveMin,
      overtimeMinutes:   overtimeMin,
      isHolidayWork: schedule.status === "OFF",
      notes: notes ?? null,
      updatedAt: now,
    },
    {
      checkInAt:     checkIn,
      checkOutAt:    checkOut,
      status:        resolvedStatus,
      lateMinutes,
      earlyLeaveMinutes: earlyLeaveMin,
      overtimeMinutes:   overtimeMin,
      ...(notes != null && { notes }),
      updatedAt: now,
    },
  );
};

// ── My today (self check-in view) ────────────────────────────────────────────

const getMyToday = async (employeeId) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

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

const getReport = async ({ branchId, startDate, endDate, employeeId }) => {
  if (!branchId)             throw new AppError("branchId is required", StatusCodes.BAD_REQUEST);
  if (!startDate || !endDate) throw new AppError("startDate and endDate are required", StatusCodes.BAD_REQUEST);

  const toDateOnly = (s) => { const d = new Date(s); d.setUTCHours(0, 0, 0, 0); return d; };
  const start = toDateOnly(startDate);
  const end   = toDateOnly(endDate);
  if (end < start) throw new AppError("endDate must be after startDate", StatusCodes.BAD_REQUEST);

  const schedules = await repo.getReportData({ branchId, startDate: start, endDate: end, employeeId });

  const byEmployee = {};

  for (const sc of schedules) {
    const eid = sc.employeeId;
    if (!byEmployee[eid]) {
      byEmployee[eid] = {
        employee:        sc.employee,
        scheduledDays:   0,
        presentDays:     0,
        absentDays:      0,
        lateDays:        0,
        earlyLeaveDays:  0,
        halfDays:        0,
        lateMinutes:     0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        holidayWorkDays: 0,
      };
    }
    const r = byEmployee[eid];
    r.scheduledDays++;

    const att = sc.attendance;
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

  const rows = Object.values(byEmployee).map((r) => ({
    ...r,
    attendanceRate: r.scheduledDays > 0
      ? Math.round((r.presentDays / r.scheduledDays) * 1000) / 10
      : 0,
  }));

  rows.sort((a, b) => a.employee.name.localeCompare(b.employee.name, "id-ID"));

  return { data: rows, period: { startDate: start, endDate: end } };
};

module.exports = { getDailyRoster, getAll, getById, checkIn, checkOut, manualSet, getMyToday, getMy, getReport };
