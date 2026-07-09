const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const repo            = require("./staffSchedule.repository");

// ── helpers ──────────────────────────────────────────────────────────────────

const dayBoundsUTC = (dateStr) => {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end   = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const toDateStr = (date) => date.toISOString().split("T")[0];

// ── Roster (grouped) ─────────────────────────────────────────────────────────

const getRoster = async ({ startDate, days = 7, branchId }) => {
  if (!startDate) throw new AppError("startDate is required", StatusCodes.BAD_REQUEST);
  if (!branchId)  throw new AppError("branchId is required",  StatusCodes.BAD_REQUEST);

  const numDays = Math.min(Math.max(parseInt(days) || 7, 1), 62);

  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = addDays(start, numDays - 1);
  end.setUTCHours(23, 59, 59, 999);

  // Build the array of date strings for this range
  const dates = [];
  for (let i = 0; i < numDays; i++) {
    dates.push(toDateStr(addDays(start, i)));
  }

  const { employeeBranches, schedules } = await repo.findRoster(branchId, start, end);

  // Build a lookup: "employeeId|dateStr" → schedule record
  const scheduleMap = new Map();
  for (const s of schedules) {
    const key = `${s.employeeId}|${toDateStr(s.workDate)}`;
    scheduleMap.set(key, s);
  }

  const rows = employeeBranches.map(({ employee }) => ({
    employee: {
      id:           employee.id,
      name:         employee.name,
      employeeCode: employee.employeeCode,
      role:         employee.role,
    },
    schedules: dates.map((date) => {
      const s = scheduleMap.get(`${employee.id}|${date}`);
      return {
        date,
        scheduleId: s?.id       ?? null,
        status:     s?.status   ?? null,
        shift:      s?.shift    ?? null,
        notes:      s?.notes    ?? null,
      };
    }),
  }));

  return { dates, rows };
};

// ── Bulk upsert ───────────────────────────────────────────────────────────────

const bulkUpsert = async ({ branchId, schedules }) => {
  if (!branchId)  throw new AppError("branchId is required",   StatusCodes.BAD_REQUEST);
  if (!schedules?.length) return { updated: 0 };

  // Validate shiftId references exist
  const shiftIds = [...new Set(schedules.map((s) => s.shiftId).filter(Boolean))];
  if (shiftIds.length) {
    const found = await prisma.shift.findMany({ where: { id: { in: shiftIds } }, select: { id: true } });
    if (found.length !== shiftIds.length)
      throw new AppError("One or more shiftId values are invalid", StatusCodes.BAD_REQUEST);
  }

  let updated = 0;

  await prisma.$transaction(async () => {
    for (const item of schedules) {
      const { start: workDate } = dayBoundsUTC(item.date);

      if (item.status === null && item.shiftId === null) {
        // Explicit clear: delete the schedule
        await repo.deleteSchedule(item.employeeId, branchId, workDate);
      } else {
        const status  = item.status  ?? (item.shiftId ? "WORKING" : "OFF");
        const shiftId = item.shiftId ?? null;

        await repo.upsertSchedule(item.employeeId, branchId, workDate, { shiftId, status });
        updated++;
      }
    }
  });

  return { updated };
};

// ── Available staff (for Appointment selector) ────────────────────────────────

const getAvailableStaff = async ({ date, branchId, startTime, endTime, excludeAppointmentId }) => {
  if (!date)     throw new AppError("date is required",     StatusCodes.BAD_REQUEST);
  if (!branchId) throw new AppError("branchId is required", StatusCodes.BAD_REQUEST);

  const { start, end } = dayBoundsUTC(date);

  let records = await prisma.staffSchedule.findMany({
    where: {
      branchId,
      status:   "WORKING",
      workDate: { gte: start, lte: end },
      employee: { isActive: true },
    },
    include: {
      employee: {
        select: {
          id:   true,
          name: true,
          role: { select: { id: true, code: true, name: true } },
        },
      },
      shift: {
        select: { id: true, code: true, name: true, startTime: true, endTime: true },
      },
    },
  });

  if (startTime && endTime) {
    // Filter: shift must cover the entire requested window
    records = records.filter((r) => {
      if (!r.shift?.startTime || !r.shift?.endTime) return false;
      return r.shift.startTime <= startTime && r.shift.endTime >= endTime;
    });

    // Filter: exclude employees with overlapping appointments
    const employeeIds = records.map((r) => r.employeeId);
    if (employeeIds.length > 0) {
      const dateStr  = date.split("T")[0];
      const reqStart = new Date(`${dateStr}T${startTime}:00`);
      const reqEnd   = new Date(`${dateStr}T${endTime}:00`);

      const appointmentFilter = {
        branchId,
        startTime: { lt: reqEnd },
        endTime:   { gt: reqStart },
        status:    { notIn: ["CANCELLED", "NO_SHOW"] },
      };
      if (excludeAppointmentId) appointmentFilter.id = { not: excludeAppointmentId };

      const conflicts = await prisma.appointmentStaff.findMany({
        where: {
          employeeId:  { in: employeeIds },
          appointment: appointmentFilter,
        },
        select: { employeeId: true },
      });

      const conflictSet = new Set(conflicts.map((c) => c.employeeId));
      records = records.filter((r) => !conflictSet.has(r.employeeId));
    }
  }

  // For today: mark staff who have already checked out
  const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0]; // WIB (UTC+7)
  let checkedOutSet = new Set();
  if (date.split("T")[0] === todayStr && records.length > 0) {
    const checkedOut = await prisma.attendance.findMany({
      where: {
        workDate:   { gte: start, lte: end },
        employeeId: { in: records.map((r) => r.employeeId) },
        checkOutAt: { not: null },
      },
      select: { employeeId: true },
    });
    checkedOutSet = new Set(checkedOut.map((a) => a.employeeId));
  }

  return records.map((r) => ({
    employeeId:    r.employeeId,
    name:          r.employee.name,
    role:          r.employee.role,
    shiftCode:     r.shift?.code      ?? null,
    startTime:     r.shift?.startTime ?? null,
    endTime:       r.shift?.endTime   ?? null,
    hasCheckedOut: checkedOutSet.has(r.employeeId),
  }));
};

const getMySchedules = async (employeeId, { startDate, endDate } = {}) => {
  if (!employeeId) throw new AppError("Employee not found", StatusCodes.BAD_REQUEST);

  const now   = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = endDate   ? new Date(endDate)   : now;
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  return prisma.staffSchedule.findMany({
    where:   { employeeId, workDate: { gte: start, lte: end } },
    include: {
      shift:      { select: { id: true, name: true, startTime: true, endTime: true } },
      attendance: { select: { id: true, checkIn: true, checkOut: true, status: true } },
    },
    orderBy: { workDate: "desc" },
  });
};

module.exports = { getRoster, bulkUpsert, getAvailableStaff, getMySchedules };
