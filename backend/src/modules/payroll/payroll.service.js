const { StatusCodes } = require("http-status-codes");
const { Prisma }      = require("@prisma/client");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo            = require("./payroll.repository");
const prisma          = require("../../config/prisma");

// ── Money helper ──────────────────────────────────────────────────────────────
const D = (v) => new Prisma.Decimal(String(v ?? 0));

// ── Period helpers ────────────────────────────────────────────────────────────
const toDateOnly = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// Build [periodStart, periodEnd] from YYYY-MM string
const buildPeriod = (yearMonth) => {
  const [y, m] = yearMonth.split("-").map(Number);
  const periodStart = toDateOnly(new Date(Date.UTC(y, m - 1, 1)));
  const periodEnd   = toDateOnly(new Date(Date.UTC(y, m, 0)));   // last day of month
  return { periodStart, periodEnd };
};

// ── Generate payroll items from raw data ──────────────────────────────────────
// ≤3 staff per appointment → Rp 75.000/orang, >3 → Rp 50.000/orang
const HS_RATE_SMALL = 75_000;
const HS_RATE_LARGE = 50_000;

const buildItems = (salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments = []) => {
  const s = salarySetting;

  // Working days = schedules that are WORKING (not OFF)
  const workingSchedules = schedules.filter((sc) => sc.status === "WORKING");
  const workingDays      = workingSchedules.length;

  // Present days = attendance with actual check-in (PRESENT/LATE/EARLY_LEAVE/HALF_DAY)
  const PRESENT_STATUSES = ["PRESENT", "LATE", "EARLY_LEAVE", "HALF_DAY"];
  const presentDays = attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).length;
  const absentDays  = Math.max(workingDays - presentDays, 0);

  // Sum minutes
  const totalLateMinutes       = attendances.reduce((acc, a) => acc + (a.lateMinutes       ?? 0), 0);
  const totalEarlyLeaveMinutes = attendances.reduce((acc, a) => acc + (a.earlyLeaveMinutes ?? 0), 0);
  const totalOvertimeMinutes   = attendances.reduce((acc, a) => acc + (a.overtimeMinutes   ?? 0), 0);

  // Transport: daily rate × absent days deducted
  const dailyTransport = workingDays > 0
    ? D(s.transportAllowance).div(D(workingDays))
    : D(0);
  const transportAmount = D(s.transportAllowance).minus(dailyTransport.mul(D(absentDays)));

  // Commissions total
  const totalCommission = commissions.reduce((acc, c) => acc + Number(c.commissionAmount), 0);

  // Overtime
  const overtimeAmount = D(totalOvertimeMinutes).mul(D(s.overtimeRatePerHour)).div(D(60));

  // BPJS bases on baseSalary
  const bpjsJht = D(s.baseSalary).mul(D(s.bpjsJhtPercent)).div(D(100));
  const bpjsJp  = D(s.baseSalary).mul(D(s.bpjsJpPercent)).div(D(100));

  // Kasbon deduction = sum of monthlyDeduction for each ACTIVE loan
  const kasbonTotal = activeLoans.reduce((acc, l) => acc + Number(l.monthlyDeduction), 0);

  const items = [];

  const addItem = (type, category, label, amount, quantity = null, rate = null) => {
    const amt = D(amount);
    if (amt.lte(0)) return; // skip zero items
    items.push({ type, category, label, amount: amt, quantity: quantity ? D(quantity) : null, rate: rate ? D(rate) : null, isAuto: true });
  };

  // Service charge home service
  const hsServiceChargeTotal = hsAppointments.reduce((acc, appt) => {
    const staffCount = appt.staffs.length;
    const rate = staffCount <= 3 ? HS_RATE_SMALL : HS_RATE_LARGE;
    return acc + rate;
  }, 0);

  // INCOME
  addItem("INCOME", "gaji",      "Gaji Pokok",            s.baseSalary);
  addItem("INCOME", "makan",     "Uang Makan",            D(s.mealAllowancePerDay).mul(D(presentDays)), presentDays, s.mealAllowancePerDay);
  addItem("INCOME", "transport", "Tunjangan Transport",   transportAmount);
  addItem("INCOME", "komisi",    "Komisi",                totalCommission);
  addItem("INCOME", "lembur",    "Lembur",                overtimeAmount, totalOvertimeMinutes, D(s.overtimeRatePerHour).div(D(60)));
  addItem("INCOME", "service_charge_hs", "Service Charge Home Service", hsServiceChargeTotal, hsAppointments.length, hsAppointments.length > 0 ? (hsAppointments[0].staffs.length <= 3 ? HS_RATE_SMALL : HS_RATE_LARGE) : 0);

  // DEDUCTION
  addItem("DEDUCTION", "absen",      "Potongan Absen",         D(s.absentDeductionPerDay).mul(D(absentDays)), absentDays, s.absentDeductionPerDay);
  addItem("DEDUCTION", "terlambat",  "Potongan Terlambat",     D(s.lateDeductionPerMinute).mul(D(totalLateMinutes)), totalLateMinutes, s.lateDeductionPerMinute);
  addItem("DEDUCTION", "pulang_cepat", "Potongan Pulang Cepat", D(s.earlyLeaveDeductionPerMinute).mul(D(totalEarlyLeaveMinutes)), totalEarlyLeaveMinutes, s.earlyLeaveDeductionPerMinute);
  addItem("DEDUCTION", "bpjs_jht",   "BPJS JHT",              bpjsJht);
  addItem("DEDUCTION", "bpjs_jp",    "BPJS JP",               bpjsJp);
  addItem("DEDUCTION", "kasbon",     "Potongan Kasbon",        kasbonTotal);

  const grossIncome     = items.filter((i) => i.type === "INCOME")    .reduce((a, i) => a.plus(i.amount), D(0));
  const totalDeductions = items.filter((i) => i.type === "DEDUCTION") .reduce((a, i) => a.plus(i.amount), D(0));
  const netSalary       = grossIncome.minus(totalDeductions);

  return { items, grossIncome, totalDeductions, netSalary, meta: { workingDays, presentDays, absentDays } };
};

// ── Service functions ─────────────────────────────────────────────────────────

const getAll = async ({ page = 1, limit = 20, employeeId, branchId, status, yearMonth }) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  if (yearMonth) {
    const { periodStart, periodEnd } = buildPeriod(yearMonth);
    where.periodStart = { gte: periodStart, lte: periodEnd };
  }
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const payroll = await repo.findById(id);
  if (!payroll) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  return payroll;
};

const generate = async ({ employeeId, branchId, yearMonth, notes }) => {
  const { periodStart, periodEnd } = buildPeriod(yearMonth);

  // Check duplicate
  const existing = await repo.findByEmployeeAndPeriod(employeeId, periodStart);
  if (existing) throw new AppError("Payroll already exists for this employee and period", StatusCodes.CONFLICT);

  const { salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments } =
    await repo.getGenerationData(employeeId, branchId, periodStart, periodEnd);

  if (!salarySetting)
    throw new AppError("No active salary setting found for this employee", StatusCodes.BAD_REQUEST);

  const { items, grossIncome, totalDeductions, netSalary } =
    buildItems(salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments);

  const payroll = await prisma.payroll.create({
    data: {
      employeeId,
      branchId,
      periodStart,
      periodEnd,
      grossIncome,
      totalDeductions,
      netSalary,
      status: "DRAFT",
      notes: notes ?? null,
      items: { createMany: { data: items } },
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, code: true, name: true } }, homeBranch: { select: { id: true, code: true, name: true } } } },
      branch:   { select: { id: true, code: true, name: true } },
      items:    { orderBy: [{ type: "asc" }, { category: "asc" }] },
    },
  });

  return payroll;
};

const recalculate = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT")
    throw new AppError("Only DRAFT payrolls can be recalculated", StatusCodes.BAD_REQUEST);

  const { salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments } =
    await repo.getGenerationData(existing.employeeId, existing.branchId, existing.periodStart, existing.periodEnd);

  if (!salarySetting)
    throw new AppError("No active salary setting found", StatusCodes.BAD_REQUEST);

  const { items, grossIncome, totalDeductions, netSalary } =
    buildItems(salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments);

  await repo.replaceAutoItems(id, items);
  return repo.update(id, { grossIncome, totalDeductions, netSalary });
};

const submitForApproval = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT")
    throw new AppError("Only DRAFT payrolls can be submitted", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "PENDING_APPROVAL" });
};

const approve = async (id, approvedBy) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "PENDING_APPROVAL")
    throw new AppError("Payroll is not pending approval", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "APPROVED", approvedBy, approvedAt: new Date() });
};

const markAsPaid = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "APPROVED")
    throw new AppError("Only APPROVED payrolls can be marked as paid", StatusCodes.BAD_REQUEST);

  // Auto-create loan repayments for kasbon items
  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });

    // Find kasbon items
    const kasbonItems = existing.items.filter((i) => i.category === "kasbon" && i.type === "DEDUCTION");
    if (kasbonItems.length > 0) {
      const activeLoans = await tx.loan.findMany({ where: { employeeId: existing.employeeId, status: "ACTIVE" } });
      for (const loan of activeLoans) {
        const repayAmt = Number(loan.monthlyDeduction);
        if (repayAmt <= 0) continue;
        const newRemaining = Math.max(Number(loan.remainingAmount) - repayAmt, 0);
        const newStatus    = newRemaining <= 0 ? "PAID_OFF" : "ACTIVE";
        await tx.loanRepayment.create({
          data: { loanId: loan.id, payrollId: id, amount: repayAmt, paidAt: new Date() },
        });
        await tx.loan.update({ where: { id: loan.id }, data: { remainingAmount: newRemaining, status: newStatus } });
      }
    }
  });

  return repo.findById(id);
};

const updateNotes = async (id, notes) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  return repo.update(id, { notes });
};

module.exports = { getAll, getById, generate, recalculate, submitForApproval, approve, markAsPaid, updateNotes };
