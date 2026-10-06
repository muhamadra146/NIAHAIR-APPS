const prisma = require("../../config/prisma");
const { wibDayStart, wibDayEnd } = require("../../utils/date");

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

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.payroll.findMany({ skip, take, where, orderBy: orderBy ?? { periodStart: "desc" }, include: PAYROLL_INCLUDE });

const count = (where) => prisma.payroll.count({ where });

const findById = (id) =>
  prisma.payroll.findUnique({ where: { id }, include: PAYROLL_INCLUDE });

const findByEmployeeAndPeriod = (employeeId, periodStart) =>
  prisma.payroll.findUnique({ where: { employeeId_periodStart: { employeeId, periodStart } }, include: PAYROLL_INCLUDE });

// Overlap check: find any payroll for this employee whose date range overlaps [start, end]
const findOverlapping = (employeeId, periodStart, periodEnd, excludeId) =>
  prisma.payroll.findFirst({
    where: {
      employeeId,
      id:          excludeId ? { not: excludeId } : undefined,
      // Tanggal inklusif: berbagi satu hari pun dianggap tumpang tindih
      periodStart: { lte: periodEnd },
      periodEnd:   { gte: periodStart },
    },
  });

const create = (data) =>
  prisma.payroll.create({ data, include: PAYROLL_INCLUDE });

// db: klien prisma atau transaksi (tx) agar bisa dipakai dalam $transaction
const update = (id, data, db = prisma) =>
  db.payroll.update({ where: { id }, data, include: PAYROLL_INCLUDE });

// Replaces all auto items for a payroll then re-inserts
const replaceAutoItems = async (payrollId, items, db = prisma) => {
  await db.payrollItem.deleteMany({ where: { payrollId, isAuto: true } });
  if (items.length > 0) {
    await db.payrollItem.createMany({ data: items.map((i) => ({ ...i, payrollId })) });
  }
};

// Data needed for payroll generation
// payrollId: saat hitung ulang, komisi yang sudah terhubung ke payroll ini tetap ikut
const getGenerationData = async (employeeId, branchId, periodStart, periodEnd, payrollId = null) => {
  // Kolom timestamp (approvedAt, createdAt) difilter dengan batas hari WIB;
  // kolom tanggal-saja (workDate, date, visitDate) tetap pakai periodStart/periodEnd.
  const tsRange = { gte: wibDayStart(periodStart), lte: wibDayEnd(periodEnd) };

  const [salarySetting, schedules, attendances, commissions, activeLoans, approvedLatePermissions, holidays, omsetBonusTiers, branchOmsetAggregate] = await Promise.all([
    // Active salary setting
    prisma.employeeSalarySettings.findFirst({
      where: { employeeId, isActive: true },
      orderBy: { effectiveDate: "desc" },
    }),

    // Staff schedules in period for this employee
    prisma.staffSchedule.findMany({
      where: {
        employeeId,
        workDate: { gte: periodStart, lte: periodEnd },
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

    // Komisi disetujui yang belum dibayar s/d akhir periode — termasuk sisa periode lalu,
    // asal belum masuk payroll lain (payrollId kosong atau payroll ini sendiri)
    prisma.commission.findMany({
      where: {
        employeeId,
        status:     "APPROVED",
        approvedAt: { lte: tsRange.lte },
        OR: payrollId ? [{ payrollId: null }, { payrollId }] : [{ payrollId: null }],
      },
      select: {
        id:               true,
        commissionAmount: true,
        approvedAt:       true,
        treatmentAssignment: {
          select: {
            treatmentItem: {
              select: { item: { select: { name: true } } },
            },
          },
        },
      },
    }),

    // Active loans for monthly deduction
    prisma.loan.findMany({
      where: { employeeId, status: "ACTIVE" },
    }),

    // Approved LATE permissions in period — used to waive late deductions
    prisma.permissionRequest.findMany({
      where: {
        employeeId,
        type:   "LATE",
        status: "APPROVED",
        date:   { gte: periodStart, lte: periodEnd },
      },
      select: { date: true },
    }),

    // Public holidays in period
    prisma.holiday.findMany({
      where: { date: { gte: periodStart, lte: periodEnd } },
      select: { date: true },
    }),

    // Omset bonus tiers for this employee (sorted ascending by minimumOmset)
    prisma.employeeOmsetBonusTier.findMany({
      where:   { employeeId },
      orderBy: { minimumOmset: "asc" },
    }),

    // Branch omset: sum of PAID invoice grandTotal in period
    prisma.invoice.aggregate({
      where: {
        branchId,
        status:    "PAID",
        createdAt: tsRange,
      },
      _sum: { grandTotal: true },
    }),
  ]);

  // Payroll bulan kerja Desember (PAY-001: dinamai dari bulan mulai periode): fetch ANNUAL leave quotas with payout rate > 0
  const isDecember = periodStart.getUTCMonth() === 11;
  const year       = periodStart.getUTCFullYear();
  let unusedLeavePayouts = [];
  if (isDecember) {
    unusedLeavePayouts = await prisma.leaveQuota.findMany({
      where: {
        employeeId,
        year,
        leaveType: { quotaType: "ANNUAL", unusedDayPayoutRate: { gt: 0 } },
      },
      include: {
        leaveType: { select: { id: true, name: true, unusedDayPayoutRate: true } },
      },
    });
  }

  const branchOmset = Number(branchOmsetAggregate._sum?.grandTotal ?? 0);

  return { salarySetting, schedules, attendances, commissions, activeLoans, unusedLeavePayouts, approvedLatePermissions, holidays, omsetBonusTiers, branchOmset };
};

const findByEmployee = ({ skip, take, where }) =>
  prisma.payroll.findMany({
    skip, take, where,
    orderBy: { periodStart: "desc" },
    include: PAYROLL_INCLUDE,
  });

const countByEmployee = (where) => prisma.payroll.count({ where });

const findBpjsData = ({ branchId, periodStart, periodEnd }) =>
  prisma.payroll.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      periodStart: { gte: periodStart, lte: periodEnd },
      status: { in: ["APPROVED", "PAID"] },
    },
    include: {
      employee: {
        select: {
          id: true, name: true, employeeCode: true,
          role: { select: { name: true } },
          salarySettings: {
            where:  { isActive: true },
            select: {
              bpjsJhtEmployerPercent:       true,
              bpjsJpEmployerPercent:        true,
              bpjsKesehatanEmployerPercent: true,
            },
            take: 1,
          },
        },
      },
      items: true,
    },
    orderBy: { employee: { name: "asc" } },
  });

const remove = (id) =>
  prisma.$transaction([
    prisma.payrollItem.deleteMany({ where: { payrollId: id } }),
    prisma.payroll.delete({ where: { id } }),
  ]);

// Bulk: fetch employees with payDay set, for bulk generate
const findEmployeesForBulkGenerate = ({ branchId, payDay }) =>
  prisma.employee.findMany({
    where: {
      isActive: true,
      // payDay kosong = semua karyawan aktif (masing-masing pakai tanggal gajiannya sendiri)
      ...(payDay ? { payDay } : {}),
      ...(branchId ? { homeBranchId: branchId } : {}),
    },
    select: { id: true, name: true, employeeCode: true, homeBranchId: true, payDay: true },
  });

// Payroll terakhir karyawan yang berakhir sebelum tanggal tsb (deteksi celah periode)
const findPreviousPayroll = (employeeId, beforeDate) =>
  prisma.payroll.findFirst({
    where:   { employeeId, periodEnd: { lt: beforeDate } },
    orderBy: { periodEnd: "desc" },
    select:  { id: true, periodStart: true, periodEnd: true },
  });

// Tanggal jadwal karyawan dalam periode (cek kelengkapan jadwal sebelum generate)
const findScheduleDates = (employeeId, periodStart, periodEnd) =>
  prisma.staffSchedule.findMany({
    where:  { employeeId, workDate: { gte: periodStart, lte: periodEnd } },
    select: { workDate: true },
  });

const findEmployeePayDay = async (employeeId) =>
  (await prisma.employee.findUnique({ where: { id: employeeId }, select: { payDay: true } }))?.payDay ?? null;

module.exports = {
  findAll, count, findById, findByEmployeeAndPeriod, findOverlapping,
  findPreviousPayroll, findEmployeePayDay, findScheduleDates,
  create, update, replaceAutoItems, getGenerationData,
  findByEmployee, countByEmployee, findBpjsData, remove,
  findEmployeesForBulkGenerate,
};
