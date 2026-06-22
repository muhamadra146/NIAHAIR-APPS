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

// Build [periodStart, periodEnd] from YYYY-MM string → full calendar month
const buildPeriod = (yearMonth) => {
  const [y, m] = yearMonth.split("-").map(Number);
  const periodStart = toDateOnly(new Date(Date.UTC(y, m - 1, 1)));
  const periodEnd   = toDateOnly(new Date(Date.UTC(y, m, 0)));   // last day of month
  return { periodStart, periodEnd };
};

// Build [periodStart, periodEnd] from payDay + target month
// e.g. payDay=7, yearMonth="2026-06" → 2026-05-07 to 2026-06-06
const buildPeriodFromPayDay = (payDay, yearMonth) => {
  const [y, m] = yearMonth.split("-").map(Number);
  // periodEnd = payDay-1 of target month
  const endDay = payDay - 1;
  let endY = y, endM = m;
  let endD = endDay;
  if (endD <= 0) {
    // e.g. payDay=1 → endDay=0 → last day of previous month
    endM = m - 1;
    if (endM <= 0) { endM = 12; endY = y - 1; }
    endD = new Date(Date.UTC(endY, endM, 0)).getUTCDate();
  }
  const periodEnd = toDateOnly(new Date(Date.UTC(endY, endM - 1, endD)));

  // periodStart = payDay of previous month
  let startM = m - 1, startY = y;
  if (startM <= 0) { startM = 12; startY = y - 1; }
  const periodStart = toDateOnly(new Date(Date.UTC(startY, startM - 1, payDay)));

  return { periodStart, periodEnd };
};

// ── Generate payroll items from raw data ──────────────────────────────────────
const HS_RATE_SMALL = 75_000;
const HS_RATE_LARGE = 50_000;

const buildItems = (salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments = [], unusedLeavePayouts = [], approvedLatePermissions = [], holidays = []) => {
  const s = salarySetting;

  // Holiday date set for O(1) lookup
  const holidaySet = new Set(
    holidays.map((h) => new Date(h.date).toISOString().split("T")[0])
  );

  // Working days = schedules that are WORKING (not OFF)
  const workingSchedules = schedules.filter((sc) => sc.status === "WORKING");
  const workingDays      = workingSchedules.length;

  // Holiday working days = schedules on a public holiday
  const holidayWorkingDays = workingSchedules.filter((sc) => {
    const dateKey = new Date(sc.workDate).toISOString().split("T")[0];
    return holidaySet.has(dateKey);
  }).length;

  // Present days = attendance with actual check-in (PRESENT/LATE/EARLY_LEAVE/HALF_DAY)
  const PRESENT_STATUSES = ["PRESENT", "LATE", "EARLY_LEAVE", "HALF_DAY"];
  const presentDays = attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).length;
  const absentDays  = Math.max(workingDays - presentDays, 0);

  // Sum minutes
  const totalEarlyLeaveMinutes = attendances.reduce((acc, a) => acc + (a.earlyLeaveMinutes ?? 0), 0);
  const totalOvertimeMinutes   = attendances.reduce((acc, a) => acc + (a.overtimeMinutes   ?? 0), 0);

  // Bracket-based late deduction — per occurrence
  const latePerm = new Set(
    approvedLatePermissions.map((p) => new Date(p.date).toISOString().split("T")[0])
  );
  const lateDeductionTotal = attendances.reduce((acc, a) => {
    const mins = a.lateMinutes ?? 0;
    if (mins <= 0) return acc;
    const dateKey = new Date(a.workDate).toISOString().split("T")[0];
    if (latePerm.has(dateKey)) return acc;
    if (mins <= 30) return acc + Number(s.lateDeductionBracket1 ?? 0);
    if (mins <= 60) return acc + Number(s.lateDeductionBracket2 ?? 0);
    return acc + Number(s.lateDeductionBracket3 ?? 0);
  }, 0);

  // Transport: daily rate × absent days deducted
  const dailyTransport = workingDays > 0
    ? D(s.transportAllowance).div(D(workingDays))
    : D(0);
  const transportAmount = D(s.transportAllowance).minus(dailyTransport.mul(D(absentDays)));

  // Commissions total
  const totalCommission = commissions.reduce((acc, c) => acc + Number(c.commissionAmount), 0);

  // Overtime (regular)
  const overtimeAmount = D(totalOvertimeMinutes).mul(D(s.overtimeRatePerHour)).div(D(60));

  // Holiday rate per day
  const holidayWorkAmount = D(holidayWorkingDays).mul(D(s.holidayRatePerDay ?? 0));

  // BPJS bases on baseSalary (Kesehatan included in calculation but only added if percent > 0)
  const bpjsJht       = D(s.baseSalary).mul(D(s.bpjsJhtPercent)).div(D(100));
  const bpjsJp        = D(s.baseSalary).mul(D(s.bpjsJpPercent)).div(D(100));

  // BPJS Kesehatan: calculated but only added to items if percent is set (configurable for future)
  const kesehatanPct  = Number(s.bpjsKesehatanEmployeePercent ?? 0);
  const bpjsKesehatan = kesehatanPct > 0
    ? D(s.baseSalary).mul(D(kesehatanPct)).div(D(100))
    : D(0);

  // Kasbon deduction = sum of monthlyDeduction for each ACTIVE loan
  const kasbonTotal = activeLoans.reduce((acc, l) => acc + Number(l.monthlyDeduction), 0);

  const items = [];

  const addItem = (type, category, label, amount, quantity = null, rate = null) => {
    const amt = D(amount);
    if (amt.lte(0)) return;
    items.push({ type, category, label, amount: amt, quantity: quantity ? D(quantity) : null, rate: rate ? D(rate) : null, isAuto: true });
  };

  // Service charge home service
  const hsServiceChargeTotal = hsAppointments.reduce((acc, appt) => {
    const staffCount = appt.staffs.length;
    const rate = staffCount <= 3 ? HS_RATE_SMALL : HS_RATE_LARGE;
    return acc + rate;
  }, 0);

  // INCOME
  addItem("INCOME", "gaji",            "Gaji Pokok",                      s.baseSalary);
  addItem("INCOME", "makan",           "Uang Makan",                      D(s.mealAllowancePerDay).mul(D(presentDays)), presentDays, s.mealAllowancePerDay);
  addItem("INCOME", "tunjangan",       "Tunjangan",                       s.tunjangan ?? 0);
  addItem("INCOME", "transport",       "Tunjangan Transport",              transportAmount);
  addItem("INCOME", "komisi",          "Komisi",                          totalCommission);
  addItem("INCOME", "lembur",          "Lembur",                          overtimeAmount, totalOvertimeMinutes, D(s.overtimeRatePerHour).div(D(60)));
  addItem("INCOME", "libur_kerja",     "Kerja di Hari Libur",             holidayWorkAmount, holidayWorkingDays, s.holidayRatePerDay ?? 0);
  addItem("INCOME", "service_charge_hs", "Service Charge Home Service",   hsServiceChargeTotal, hsAppointments.length, hsAppointments.length > 0 ? (hsAppointments[0].staffs.length <= 3 ? HS_RATE_SMALL : HS_RATE_LARGE) : 0);

  // Payout cuti tahunan tidak terpakai (hanya bulan Desember)
  for (const q of unusedLeavePayouts) {
    const unusedDays = q.totalDays - q.usedDays;
    if (unusedDays > 0) {
      const amount = D(unusedDays).mul(D(q.leaveType.unusedDayPayoutRate));
      addItem("INCOME", "payout_cuti", `Payout Cuti Sisa – ${q.leaveType.name}`, amount, unusedDays, q.leaveType.unusedDayPayoutRate);
    }
  }

  // DEDUCTION
  addItem("DEDUCTION", "absen",          "Potongan Absen",          D(s.absentDeductionPerDay).mul(D(absentDays)), absentDays, s.absentDeductionPerDay);
  addItem("DEDUCTION", "terlambat",      "Potongan Terlambat",      lateDeductionTotal);
  addItem("DEDUCTION", "pulang_cepat",   "Potongan Pulang Cepat",   D(s.earlyLeaveDeductionPerMinute).mul(D(totalEarlyLeaveMinutes)), totalEarlyLeaveMinutes, s.earlyLeaveDeductionPerMinute);
  addItem("DEDUCTION", "bpjs_jht",       "BPJS JHT",                bpjsJht);
  addItem("DEDUCTION", "bpjs_jp",        "BPJS JP",                 bpjsJp);
  if (!bpjsKesehatan.isZero()) {
    addItem("DEDUCTION", "bpjs_kesehatan", "BPJS Kesehatan",        bpjsKesehatan);
  }
  addItem("DEDUCTION", "kasbon",         "Potongan Kasbon",         kasbonTotal);

  const grossIncome     = items.filter((i) => i.type === "INCOME")    .reduce((a, i) => a.plus(i.amount), D(0));
  const totalDeductions = items.filter((i) => i.type === "DEDUCTION") .reduce((a, i) => a.plus(i.amount), D(0));
  const netSalary       = grossIncome.minus(totalDeductions);

  return { items, grossIncome, totalDeductions, netSalary, meta: { workingDays, presentDays, absentDays, holidayWorkingDays } };
};

// ── Commission breakdown helper ───────────────────────────────────────────────
const buildCommissionBreakdown = (commissions) =>
  commissions.map((c) => ({
    id:               c.id,
    commissionAmount: Number(c.commissionAmount),
    approvedAt:       c.approvedAt,
    treatmentName:    c.treatmentAssignment?.treatmentItem?.item?.name ?? null,
  }));

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

const generate = async ({ employeeId, branchId, yearMonth, payDay, periodStart: ps, periodEnd: pe, notes }, createdBy) => {
  let periodStart, periodEnd;

  if (yearMonth && payDay) {
    // Pay-day-based period
    ({ periodStart, periodEnd } = buildPeriodFromPayDay(Number(payDay), yearMonth));
  } else if (yearMonth) {
    ({ periodStart, periodEnd } = buildPeriod(yearMonth));
  } else if (ps && pe) {
    periodStart = toDateOnly(new Date(ps));
    periodEnd   = toDateOnly(new Date(pe));
    if (periodEnd < periodStart) throw new AppError("periodEnd must be after periodStart", StatusCodes.BAD_REQUEST);
  } else {
    throw new AppError("Either yearMonth or periodStart+periodEnd is required", StatusCodes.BAD_REQUEST);
  }

  // Overlap check
  const overlapping = await repo.findOverlapping(employeeId, periodStart, periodEnd, null);
  if (overlapping) throw new AppError("Payroll sudah ada untuk periode ini (overlap terdeteksi)", StatusCodes.CONFLICT);

  const { salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments, unusedLeavePayouts, approvedLatePermissions, holidays } =
    await repo.getGenerationData(employeeId, branchId, periodStart, periodEnd);

  if (!salarySetting)
    throw new AppError("No active salary setting found for this employee", StatusCodes.BAD_REQUEST);

  const { items, grossIncome, totalDeductions, netSalary } =
    buildItems(salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments, unusedLeavePayouts, approvedLatePermissions, holidays);

  const payroll = await prisma.payroll.create({
    data: {
      employeeId,
      branchId,
      periodStart,
      periodEnd,
      grossIncome,
      totalDeductions,
      netSalary,
      status:    "DRAFT",
      notes:     notes ?? null,
      createdBy: createdBy ?? null,
      items: { createMany: { data: items } },
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, code: true, name: true } }, homeBranch: { select: { id: true, code: true, name: true } } } },
      branch:   { select: { id: true, code: true, name: true } },
      items:    { orderBy: [{ type: "asc" }, { category: "asc" }] },
    },
  });

  return { ...payroll, commissionBreakdown: buildCommissionBreakdown(commissions) };
};

const recalculate = async (id, userId) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT")
    throw new AppError("Only DRAFT payrolls can be recalculated", StatusCodes.BAD_REQUEST);

  const { salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments, unusedLeavePayouts, approvedLatePermissions, holidays } =
    await repo.getGenerationData(existing.employeeId, existing.branchId, existing.periodStart, existing.periodEnd);

  if (!salarySetting)
    throw new AppError("No active salary setting found", StatusCodes.BAD_REQUEST);

  const { items, grossIncome, totalDeductions, netSalary } =
    buildItems(salarySetting, schedules, attendances, commissions, activeLoans, hsAppointments, unusedLeavePayouts, approvedLatePermissions, holidays);

  await repo.replaceAutoItems(id, items);
  const updated = await repo.update(id, {
    grossIncome,
    totalDeductions,
    netSalary,
    lastRecalculatedBy: userId ?? null,
    lastRecalculatedAt: new Date(),
  });

  return { ...updated, commissionBreakdown: buildCommissionBreakdown(commissions) };
};

const submitForApproval = async (id, userId) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT")
    throw new AppError("Only DRAFT payrolls can be submitted", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "PENDING_APPROVAL", submittedBy: userId ?? null, submittedAt: new Date() });
};

const approve = async (id, approvedBy) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "PENDING_APPROVAL")
    throw new AppError("Payroll is not pending approval", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "APPROVED", approvedBy, approvedAt: new Date() });
};

const markAsPaid = async (id, paidBy) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "APPROVED")
    throw new AppError("Only APPROVED payrolls can be marked as paid", StatusCodes.BAD_REQUEST);

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date(), paidBy: paidBy ?? null },
    });

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

// ── Employee self-service ─────────────────────────────────────────────────────

const getMy = async ({ employeeId, page = 1, limit = 20 }) => {
  if (!employeeId) throw new AppError("Employee not found for this user", StatusCodes.BAD_REQUEST);
  const { skip, take } = paginate(page, limit);
  const where = { employeeId, status: { in: ["APPROVED", "PAID"] } };
  const [rows, total] = await Promise.all([
    repo.findByEmployee({ skip, take, where }),
    repo.countByEmployee(where),
  ]);

  // Attach commission breakdown to each payroll
  const data = await Promise.all(rows.map(async (p) => {
    const commissions = await prisma.commission.findMany({
      where: {
        employeeId: p.employeeId,
        status:     "APPROVED",
        approvedAt: { gte: p.periodStart, lte: p.periodEnd },
      },
      select: {
        id: true, commissionAmount: true, approvedAt: true,
        treatmentAssignment: {
          select: { treatmentItem: { select: { item: { select: { name: true } } } } },
        },
      },
    });
    return { ...p, commissionBreakdown: buildCommissionBreakdown(commissions) };
  }));

  return { data, meta: paginationMeta(total, page, limit) };
};

// ── BPJS report ───────────────────────────────────────────────────────────────

const getBpjsReport = async ({ branchId, yearMonth }) => {
  if (!yearMonth) throw new AppError("yearMonth is required", StatusCodes.BAD_REQUEST);

  const { periodStart, periodEnd } = buildPeriod(yearMonth);
  const payrolls = await repo.findBpjsData({ branchId, periodStart, periodEnd });

  const getAmt = (items, cat) => Number(items.find((i) => i.category === cat)?.amount ?? 0);

  const rows = payrolls.map((p) => {
    const setting    = p.employee.salarySettings?.[0];
    const baseSalary = getAmt(p.items, "gaji");

    const bpjsJht       = getAmt(p.items, "bpjs_jht");
    const bpjsJp        = getAmt(p.items, "bpjs_jp");
    const bpjsKesehatan = getAmt(p.items, "bpjs_kesehatan");

    const jhtEmpPct      = Number(setting?.bpjsJhtEmployerPercent       ?? 0);
    const jpEmpPct       = Number(setting?.bpjsJpEmployerPercent        ?? 0);
    const kesEmpPct      = Number(setting?.bpjsKesehatanEmployerPercent ?? 0);

    const bpjsJhtEmployer       = Math.round(baseSalary * jhtEmpPct / 100);
    const bpjsJpEmployer        = Math.round(baseSalary * jpEmpPct  / 100);
    const bpjsKesehatanEmployer = Math.round(baseSalary * kesEmpPct / 100);

    const totalEmployee = bpjsJht + bpjsJp + bpjsKesehatan;
    const totalEmployer = bpjsJhtEmployer + bpjsJpEmployer + bpjsKesehatanEmployer;

    const { salarySettings: _ss, ...employee } = p.employee;

    return {
      employee,
      periodStart:   p.periodStart,
      periodEnd:     p.periodEnd,
      status:        p.status,
      baseSalary,
      bpjsJht,       bpjsJhtEmployer,
      bpjsJp,        bpjsJpEmployer,
      bpjsKesehatan, bpjsKesehatanEmployer,
      totalEmployee,
      totalEmployer,
      totalBpjs: totalEmployee + totalEmployer,
    };
  });

  const sum = (key) => rows.reduce((s, r) => s + r[key], 0);
  const totals = {
    baseSalary:           sum("baseSalary"),
    bpjsJht:              sum("bpjsJht"),
    bpjsJhtEmployer:      sum("bpjsJhtEmployer"),
    bpjsJp:               sum("bpjsJp"),
    bpjsJpEmployer:       sum("bpjsJpEmployer"),
    bpjsKesehatan:        sum("bpjsKesehatan"),
    bpjsKesehatanEmployer: sum("bpjsKesehatanEmployer"),
    totalEmployee:        sum("totalEmployee"),
    totalEmployer:        sum("totalEmployer"),
    totalBpjs:            sum("totalBpjs"),
  };

  return { data: rows, totals, period: { yearMonth, periodStart, periodEnd } };
};

// ── Bulk generate ─────────────────────────────────────────────────────────────

const bulkGenerate = async ({ branchId, payDay, yearMonth, notes }, createdBy) => {
  if (!payDay)    throw new AppError("payDay is required", StatusCodes.BAD_REQUEST);
  if (!yearMonth) throw new AppError("yearMonth is required", StatusCodes.BAD_REQUEST);

  const employees = await repo.findEmployeesForBulkGenerate({ branchId, payDay: Number(payDay) });

  const results = [];
  for (const emp of employees) {
    try {
      const payroll = await generate(
        { employeeId: emp.id, branchId: emp.homeBranchId ?? branchId, yearMonth, payDay, notes },
        createdBy,
      );
      results.push({ employeeId: emp.id, name: emp.name, employeeCode: emp.employeeCode, status: "created", payrollId: payroll.id });
    } catch (err) {
      results.push({ employeeId: emp.id, name: emp.name, employeeCode: emp.employeeCode, status: "error", error: err.message });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const errors  = results.filter((r) => r.status === "error").length;

  return { results, summary: { total: employees.length, created, errors } };
};

const deletePayroll = async (id) => {
  const payroll = await repo.findById(id);
  if (!payroll) throw new AppError("Payroll not found", StatusCodes.NOT_FOUND);
  if (payroll.status !== "DRAFT")
    throw new AppError("Hanya payroll dengan status Draft yang dapat dihapus", StatusCodes.UNPROCESSABLE_ENTITY);
  await repo.remove(id);
  return { deleted: true };
};

module.exports = {
  getAll, getById, generate, recalculate, submitForApproval, approve,
  markAsPaid, updateNotes, getMy, getBpjsReport, bulkGenerate, deletePayroll,
};
