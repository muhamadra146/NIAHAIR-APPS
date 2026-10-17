const prisma = require("../../config/prisma");

const SHIFT_SELECT = {
  id: true, code: true, name: true, startTime: true, endTime: true, color: true, isWorking: true,
};

const EMPLOYEE_SELECT = {
  id: true, name: true, employeeCode: true,
  divisionId: true, homeBranchId: true, isDivisionManager: true,
  role:     { select: { id: true, code: true, name: true } },
  division: { select: { id: true, code: true, name: true } },
};

// ── Roster query: all employees in branch + their schedules for a date range ──
// employeeWhere: batas karyawan yang boleh dilihat (aturan divisi, lihat division.access)
const findRoster = async (branchId, startDate, endDate, employeeWhere = {}) => {
  // 1. Try employees assigned to this specific branch via EmployeeBranch
  let employeeBranches = await prisma.employeeBranch.findMany({
    where: { branchId, isActive: true, employee: { isActive: true, ...employeeWhere } },
    include: { employee: { select: EMPLOYEE_SELECT } },
    orderBy: { employee: { name: "asc" } },
  });

  // Fallback: if no EmployeeBranch records exist, show all active employees.
  // This supports setups where employees haven't been branch-assigned yet
  // while still keeping schedules per-branch.
  if (employeeBranches.length === 0) {
    const allEmployees = await prisma.employee.findMany({
      where: { isActive: true, ...employeeWhere },
      select: EMPLOYEE_SELECT,
      orderBy: { name: "asc" },
    });
    employeeBranches = allEmployees.map((employee) => ({
      employeeId: employee.id,
      employee,
    }));
  }

  // 2. All schedules for those employees in the date range, filtered by branchId
  const employeeIds = employeeBranches.map((eb) => eb.employeeId);

  const schedules = employeeIds.length
    ? await prisma.staffSchedule.findMany({
        where: {
          employeeId: { in: employeeIds },
          branchId,
          workDate: { gte: startDate, lte: endDate },
        },
        include: { shift: { select: SHIFT_SELECT } },
      })
    : [];

  return { employeeBranches, schedules };
};

// client: klien transaksi (tx) agar simpan massal bersifat atomik; default prisma
const upsertSchedule = (employeeId, branchId, workDate, data, client = prisma) =>
  client.staffSchedule.upsert({
    where: { employeeId_branchId_workDate: { employeeId, branchId, workDate } },
    update: data,
    create: { employeeId, branchId, workDate, ...data },
    include: { shift: { select: SHIFT_SELECT } },
  });

const deleteSchedule = (employeeId, branchId, workDate, client = prisma) =>
  client.staffSchedule.deleteMany({
    where: { employeeId, branchId, workDate },
  });

/** Karyawan + akses cabangnya (cabang utama & akses cabang aktif) */
const findEmployeesBranchAccess = (employeeIds) =>
  prisma.employee.findMany({
    where:  { id: { in: employeeIds } },
    select: {
      id: true, name: true, homeBranchId: true,
      employeeBranches: { where: { isActive: true }, select: { branchId: true } },
    },
  });

/**
 * Cuti / izin tidak masuk / sakit yang SUDAH DISETUJUI dan beririsan dengan rentang [from, to]
 * untuk karyawan-karyawan tsb (tanggal disimpan 00:00 UTC).
 */
const findApprovedAbsences = async (employeeIds, from, to) => {
  const [leaves, permissions, sickLeaves] = await Promise.all([
    prisma.leave.findMany({
      where:  { employeeId: { in: employeeIds }, status: "APPROVED", startDate: { lte: to }, endDate: { gte: from } },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
    prisma.permissionRequest.findMany({
      where:  { employeeId: { in: employeeIds }, status: "APPROVED", type: "ABSENCE", date: { gte: from, lte: to } },
      select: { employeeId: true, date: true },
    }),
    prisma.sickLeave.findMany({
      where:  { employeeId: { in: employeeIds }, status: "APPROVED", startDate: { lte: to }, endDate: { gte: from } },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ]);
  return { leaves, permissions, sickLeaves };
};

const findAvailableByDateAndBranch = (branchId, workDate) =>
  prisma.staffSchedule.findMany({
    where: {
      branchId,
      workDate,
      status: "WORKING",
      employee: { isActive: true },
    },
    include: {
      employee: { select: EMPLOYEE_SELECT },
      shift:    { select: SHIFT_SELECT   },
    },
  });

module.exports = {
  findRoster, upsertSchedule, deleteSchedule, findAvailableByDateAndBranch,
  findEmployeesBranchAccess, findApprovedAbsences,
};
