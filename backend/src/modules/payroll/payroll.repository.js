const prisma = require("../../config/prisma");

const ITEM_INCLUDE = { items: { orderBy: [{ type: "asc" }, { category: "asc" }] } };

const PAYROLL_INCLUDE = {
  employee: {
    select: {
      id: true, name: true, employeeCode: true,
      role: { select: { id: true, code: true, name: true } },
      homeBranch: { select: { id: true, code: true, name: true } },
    },
  },
  branch: { select: { id: true, code: true, name: true } },
  ...ITEM_INCLUDE,
};

const findAll = ({ skip, take, where }) =>
  prisma.payroll.findMany({ skip, take, where, orderBy: { periodStart: "desc" }, include: PAYROLL_INCLUDE });

const count = (where) => prisma.payroll.count({ where });

const findById = (id) =>
  prisma.payroll.findUnique({ where: { id }, include: PAYROLL_INCLUDE });

const findByEmployeeAndPeriod = (employeeId, periodStart) =>
  prisma.payroll.findUnique({ where: { employeeId_periodStart: { employeeId, periodStart } }, include: PAYROLL_INCLUDE });

const create = (data) =>
  prisma.payroll.create({ data, include: PAYROLL_INCLUDE });

const update = (id, data) =>
  prisma.payroll.update({ where: { id }, data, include: PAYROLL_INCLUDE });

// Replaces all auto items for a payroll then re-inserts
const replaceAutoItems = async (payrollId, items) => {
  await prisma.payrollItem.deleteMany({ where: { payrollId, isAuto: true } });
  if (items.length > 0) {
    await prisma.payrollItem.createMany({ data: items.map((i) => ({ ...i, payrollId })) });
  }
};

// Data needed for payroll generation
const getGenerationData = async (employeeId, branchId, periodStart, periodEnd) => {
  const [salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments] = await Promise.all([
    // Active salary setting
    prisma.employeeSalarySettings.findFirst({
      where: { employeeId, isActive: true },
      orderBy: { effectiveDate: "desc" },
    }),

    // Staff schedules in period for this employee at any branch (for attendance linking)
    prisma.staffSchedule.findMany({
      where: {
        employeeId,
        scheduleDate: { gte: periodStart, lte: periodEnd },
      },
      include: {
        shift: { select: { id: true, startTime: true, endTime: true } },
        attendance: true,
      },
    }),

    // Attendance records in period
    prisma.attendance.findMany({
      where: {
        employeeId,
        workDate: { gte: periodStart, lte: periodEnd },
      },
    }),

    // Approved commissions in period
    prisma.commission.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        approvedAt: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, commissionAmount: true },
    }),

    // Active loans for monthly deduction
    prisma.loan.findMany({
      where: { employeeId, status: "ACTIVE" },
    }),

    // Home service appointments in period where this employee was staff
    prisma.appointment.findMany({
      where: {
        type:      "HOME_SERVICE",
        visitDate: { gte: periodStart, lte: periodEnd },
        status:    { in: ["IN_PROGRESS", "COMPLETED"] },
        staffs:    { some: { employeeId } },
      },
      select: {
        id:     true,
        staffs: { select: { employeeId: true } },
      },
    }),
  ]);

  return { salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments };
};

module.exports = {
  findAll, count, findById, findByEmployeeAndPeriod,
  create, update, replaceAutoItems, getGenerationData,
};
