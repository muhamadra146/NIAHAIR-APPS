const prisma = require("../../config/prisma");

const SHIFT_SELECT = {
  id: true, code: true, name: true, startTime: true, endTime: true, color: true, isWorking: true,
};

const EMPLOYEE_SELECT = {
  id: true, name: true, employeeCode: true,
  role: { select: { id: true, code: true, name: true } },
};

// ── Roster query: all employees in branch + their schedules for a date range ──
const findRoster = async (branchId, startDate, endDate) => {
  // 1. Try employees assigned to this specific branch via EmployeeBranch
  let employeeBranches = await prisma.employeeBranch.findMany({
    where: { branchId, isActive: true, employee: { isActive: true } },
    include: { employee: { select: EMPLOYEE_SELECT } },
    orderBy: { employee: { name: "asc" } },
  });

  // Fallback: if no EmployeeBranch records exist, show all active employees.
  // This supports setups where employees haven't been branch-assigned yet
  // while still keeping schedules per-branch.
  if (employeeBranches.length === 0) {
    const allEmployees = await prisma.employee.findMany({
      where: { isActive: true },
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

const upsertSchedule = (employeeId, branchId, workDate, data) =>
  prisma.staffSchedule.upsert({
    where: { employeeId_branchId_workDate: { employeeId, branchId, workDate } },
    update: data,
    create: { employeeId, branchId, workDate, ...data },
    include: { shift: { select: SHIFT_SELECT } },
  });

const deleteSchedule = (employeeId, branchId, workDate) =>
  prisma.staffSchedule.deleteMany({
    where: { employeeId, branchId, workDate },
  });

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

module.exports = { findRoster, upsertSchedule, deleteSchedule, findAvailableByDateAndBranch };
