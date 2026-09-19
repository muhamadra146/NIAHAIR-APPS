const prisma = require("../../config/prisma");

const INCLUDE = {
  employee:      { select: { id: true, name: true, employeeCode: true } },
  // staffSchedule: include shift relation to get startTime/endTime (model has no shiftStart/shiftEnd)
  staffSchedule: {
    select: {
      id: true, workDate: true,
      shift: { select: { startTime: true, endTime: true } },
    },
  },
  // attendance: Prisma field names are checkInAt/checkOutAt; normalize maps to checkIn/checkOut
  attendance:    { select: { id: true, checkInAt: true, checkOutAt: true } },
  reviewer:      { select: { id: true, employee: { select: { name: true } } } },
};

const normalize = (row) => {
  if (!row) return row;
  const r = { ...row };
  if (r.reviewer) {
    r.reviewer = { id: r.reviewer.id, name: r.reviewer.employee?.name ?? null };
  }
  // Flatten shift times onto staffSchedule for frontend compatibility
  if (r.staffSchedule) {
    r.staffSchedule = {
      id:        r.staffSchedule.id,
      workDate:  r.staffSchedule.workDate,
      shiftStart: r.staffSchedule.shift?.startTime ?? null,
      shiftEnd:   r.staffSchedule.shift?.endTime   ?? null,
    };
  }
  // Map DB names to API shape expected by frontend (checkIn / checkOut)
  if (r.attendance) {
    r.attendance = {
      id:       r.attendance.id,
      checkIn:  r.attendance.checkInAt  ?? null,
      checkOut: r.attendance.checkOutAt ?? null,
    };
  }
  return r;
};

const findAll = async ({ skip, take, where }) => {
  const rows = await prisma.attendanceCorrectionRequest.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  return rows.map(normalize);
};

const count = (where) => prisma.attendanceCorrectionRequest.count({ where });

const findById = async (id) => {
  const row = await prisma.attendanceCorrectionRequest.findUnique({ where: { id }, include: INCLUDE });
  return normalize(row);
};

const create = async (data) => {
  const row = await prisma.attendanceCorrectionRequest.create({ data, include: INCLUDE });
  return normalize(row);
};

const update = async (id, data) => {
  const row = await prisma.attendanceCorrectionRequest.update({ where: { id }, data, include: INCLUDE });
  return normalize(row);
};

module.exports = { findAll, count, findById, create, update };
