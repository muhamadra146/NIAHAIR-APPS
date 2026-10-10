const { StatusCodes } = require("http-status-codes");
const { Prisma }      = require("@prisma/client");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");
const { wibDateStr } = require("../../utils/date");
const { buildWorkPeriod, DEFAULT_PAY_DAY } = require("../../utils/payPeriod");
const { computeMealAllowance, computeTransportAllowance, computeProration, computeAlphaDays, countUnscheduledDays, PRESENT_STATUSES } = require("./payroll.calc");
const repo            = require("./payroll.repository");
const { createSyncJob } = require("../syncQueue/syncQueue.service");

const ORDER_MAP = {
  periodStart:    { periodStart: "asc" },
  "-periodStart": { periodStart: "desc" },
  createdAt:      { createdAt: "asc" },
  "-createdAt":   { createdAt: "desc" },
  status:         { status: "asc" },
  "-status":      { status: "desc" },
};
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

// Periode gaji dari payDay: lihat utils/payPeriod (dipakai juga oleh Komisi Saya)

// ── Generate payroll items from raw data ──────────────────────────────────────
// Home Service tidak dihitung di payroll: dibayar lewat komisi kategori HS
// (job Home Service + tarif bawaan per jumlah staf), lihat COM-013 & COM-016.
const buildItems = (salarySetting, schedules, attendances, commissions, activeLoans, unusedLeavePayouts = [], approvedLatePermissions = [], holidays = [], omsetBonusTiers = [], branchOmset = 0, periodStart = null, periodEnd = null, employment = null) => {
  const s = salarySetting;
  // Tanggal masuk / resign karyawan (PAY-001: masuk/keluar di tengah periode)
  const hireDate   = employment?.hireDate   ?? null;
  const resignDate = employment?.resignDate ?? null;
  const hasPeriod  = Boolean(periodStart && periodEnd);

  // Holiday date set for O(1) lookup
  const holidaySet = new Set(
    holidays.map((h) => new Date(h.date).toISOString().split("T")[0])
  );

  // Working days = schedules that are WORKING (not OFF)
  const workingSchedules = schedules.filter((sc) => sc.status === "WORKING");
  const workingDays      = workingSchedules.length;

  // Kerja hari libur = hari libur nasional yang benar-benar dihadiri (ada absensi hadir), bukan sekadar dijadwalkan
  const presentDateSet = new Set(
    attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).map((a) => new Date(a.workDate).toISOString().split("T")[0])
  );
  const holidayWorkingDays = [...presentDateSet].filter((d) => holidaySet.has(d)).length;

  // Present days = attendance with actual check-in (PRESENT/LATE/EARLY_LEAVE/HALF_DAY)
  const presentDays = attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).length;
  // Potongan Absen (PAY-019): hanya alpha — hari kerja tanpa absensi hadir; OFF, libur nasional,
  // Cuti/Izin/Sakit dan hari di luar masa kerja tidak dihitung
  const absentDays  = hasPeriod
    ? computeAlphaDays({ periodStart, periodEnd, schedules, attendances, holidays, hireDate, resignDate })
    : Math.max(workingDays - presentDays, 0);

  // Gaji pokok proporsional bila masuk/keluar di tengah periode (PAY-001)
  const proration = hasPeriod
    ? computeProration({ periodStart, periodEnd, schedules, hireDate, resignDate })
    : { prorated: false };
  const baseSalaryAmount = proration.prorated ? D(s.baseSalary).mul(proration.factor) : D(s.baseSalary);
  const tunjanganAmount  = proration.prorated ? D(s.tunjangan ?? 0).mul(proration.factor) : D(s.tunjangan ?? 0);

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

  // Transport (PAY-018): pembagi = hari periode − hari OFF; tiap hari tidak hadir dipotong tarif harian
  const transport = hasPeriod
    ? computeTransportAllowance({ monthlyAmount: s.transportAllowance, periodStart, periodEnd, schedules, attendances, holidays, hireDate, resignDate })
    : { amount: D(s.transportAllowance), absentDays: 0, divisor: 0, dailyRate: D(0) };
  const transportAmount = transport.amount;

  // Uang makan (PAY-018): per hari masuk; setengah bila pulang sebelum batas setengah hari
  const meal = computeMealAllowance({ ratePerDay: s.mealAllowancePerDay, attendances, schedules });

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

  // Kasbon deduction = sum cicilan per loan — gunakan Math.min agar cicilan terakhir
  // tidak melebihi sisa (Bug fix #1: partial last installment)
  const kasbonTotal = activeLoans.reduce(
    (acc, l) => acc + Math.min(Number(l.monthlyDeduction), Number(l.remainingAmount)),
    0
  );

  const items = [];

  const addItem = (type, category, label, amount, quantity = null, rate = null) => {
    const amt = D(amount);
    if (amt.lte(0)) return;
    items.push({ type, category, label, amount: amt, quantity: quantity ? D(quantity) : null, rate: rate ? D(rate) : null, isAuto: true });
  };

  // INCOME
  if (proration.prorated) {
    addItem("INCOME", "gaji", `Gaji Pokok (${proration.employedWorkDays}/${proration.divisor} hari kerja)`, baseSalaryAmount, proration.employedWorkDays, D(s.baseSalary).div(D(proration.divisor)));
  } else {
    addItem("INCOME", "gaji",            "Gaji Pokok",                      baseSalaryAmount);
  }
  addItem("INCOME", "makan",           meal.halfDays > 0 ? `Uang Makan (${meal.fullDays} penuh, ${meal.halfDays} setengah hari)` : "Uang Makan", meal.amount, meal.units, s.mealAllowancePerDay);
  if (proration.prorated) {
    addItem("INCOME", "tunjangan", `Tunjangan (${proration.employedWorkDays}/${proration.divisor} hari kerja)`, tunjanganAmount, proration.employedWorkDays, D(s.tunjangan ?? 0).div(D(proration.divisor)));
  } else {
    addItem("INCOME", "tunjangan",       "Tunjangan",                       tunjanganAmount);
  }
  addItem("INCOME", "transport",       transport.absentDays > 0 ? `Tunjangan Transport (potong ${transport.absentDays} hari tidak hadir)` : "Tunjangan Transport", transportAmount, transport.divisor ? (transport.employedWorkDays ?? transport.divisor) - transport.absentDays : null, transport.divisor ? transport.dailyRate : null);
  addItem("INCOME", "komisi",          "Komisi",                          totalCommission);
  addItem("INCOME", "lembur",          "Lembur",                          overtimeAmount, totalOvertimeMinutes, D(s.overtimeRatePerHour).div(D(60)));
  addItem("INCOME", "libur_kerja",     "Kerja di Hari Libur",             holidayWorkAmount, holidayWorkingDays, s.holidayRatePerDay ?? 0);

  // Omset bonus — cari tier tertinggi yang dicapai
  if (omsetBonusTiers.length > 0 && branchOmset > 0) {
    // Tiers sudah diurutkan ascending berdasarkan minimumOmset (dari repo)
    // Cari tier tertinggi yang omset aktual >= minimumOmset
    let hitTier = null;
    for (const tier of omsetBonusTiers) {
      if (branchOmset >= Number(tier.minimumOmset)) {
        hitTier = tier;
      }
    }
    if (hitTier) {
      const bonusAmount = D(branchOmset).mul(D(hitTier.percentage)).div(D(100));
      addItem(
        "INCOME",
        "bonus_omset",
        `Bonus Omset (${hitTier.percentage}% × ${new Intl.NumberFormat("id-ID").format(branchOmset)})`,
        bonusAmount,
        null,
        hitTier.percentage,
      );
    }
  }

  // Payout cuti tahunan tidak terpakai (hanya bulan Desember)
  for (const q of unusedLeavePayouts) {
    const unusedDays = q.totalDays - q.usedDays;
    if (unusedDays > 0) {
      const amount = D(unusedDays).mul(D(q.leaveType.unusedDayPayoutRate));
      addItem("INCOME", "payout_cuti", `Payout Cuti Sisa – ${q.leaveType.name}`, amount, unusedDays, q.leaveType.unusedDayPayoutRate);
    }
  }

  // DEDUCTION
  addItem("DEDUCTION", "absen",          "Potongan Alpha",          D(s.absentDeductionPerDay).mul(D(absentDays)), absentDays, s.absentDeductionPerDay);
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

  return {
    items, grossIncome, totalDeductions, netSalary,
    meta: { workingDays, presentDays, absentDays, holidayWorkingDays, transportAbsentDays: transport.absentDays, transportDivisor: transport.divisor, mealUnits: meal.units, prorated: Boolean(proration.prorated) },
  };
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

const getAll = async ({ page = 1, limit = 20, employeeId, branchId, status, yearMonth, sortBy }) => {
  const { skip, take } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP, "-periodStart");
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  if (yearMonth) {
    const { periodStart, periodEnd } = buildPeriod(yearMonth);
    where.periodStart = { gte: periodStart, lte: periodEnd };
  }
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where, orderBy }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const payroll = await repo.findById(id);
  if (!payroll) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);
  return payroll;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const wibToday = () => wibDateStr(new Date());
const fmtDay = (d) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Periode payroll. Mode bulan memakai BULAN KERJA + tanggal gajian karyawan (utils/payPeriod),
 * sama dengan bulk generate dan Komisi Saya. Mode rentang untuk periode transisi / kasus khusus.
 */
const resolveGeneratePeriod = async ({ employeeId, yearMonth, payDay, periodStart: ps, periodEnd: pe }) => {
  if (yearMonth) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth))
      throw new AppError("Format bulan harus YYYY-MM", StatusCodes.BAD_REQUEST);
    const pd = Number(payDay) || (await repo.findEmployeePayDay(employeeId)) || DEFAULT_PAY_DAY;
    return { ...buildWorkPeriod(pd, yearMonth), payDay: pd, yearMonth };
  }
  if (ps && pe) {
    const periodStart = toDateOnly(new Date(ps));
    const periodEnd   = toDateOnly(new Date(pe));
    if (periodEnd < periodStart)
      throw new AppError("Tanggal akhir harus setelah tanggal mulai", StatusCodes.BAD_REQUEST);
    return { periodStart, periodEnd, payDate: null, payDay: null, yearMonth: null };
  }
  throw new AppError("Pilih bulan atau rentang tanggal", StatusCodes.BAD_REQUEST);
};

/** Tumpang tindih (error) dan celah dari payroll sebelumnya (peringatan) — lubang tanggal gajian diubah */
const checkPeriodContinuity = async (employeeId, periodStart, periodEnd, excludeId = null) => {
  const overlapping = await repo.findOverlapping(employeeId, periodStart, periodEnd, excludeId);
  const conflict = overlapping
    ? `Sudah ada payroll periode ${fmtDay(overlapping.periodStart)} – ${fmtDay(overlapping.periodEnd)} yang tumpang tindih. ` +
      `Jika tanggal gajian karyawan diubah, buat periode transisi dengan mode "Rentang Tanggal" mulai ${fmtDay(new Date(new Date(overlapping.periodEnd).getTime() + DAY_MS))}.`
    : null;

  const warnings = [];

  // Periode belum selesai → hari yang belum lewat dihitung tidak hadir (transport terpotong)
  if (new Date(periodEnd) >= toDateOnly(wibToday())) {
    warnings.push(
      `Periode belum selesai (berakhir ${fmtDay(periodEnd)}). Hari yang belum dilewati dihitung tidak hadir — ` +
      `hitung ulang payroll setelah periode berakhir.`,
    );
  }

  // Jadwal belum lengkap → hari tanpa jadwal dianggap hari kerja (PAY-018)
  const schedules = await repo.findScheduleDates(employeeId, periodStart, periodEnd);
  const unscheduled = countUnscheduledDays({ periodStart, periodEnd, schedules });
  if (unscheduled > 0) {
    warnings.push(
      `Jadwal belum lengkap: ${unscheduled} hari belum diatur. Hari tanpa jadwal dianggap hari kerja — ` +
      `isi hari libur (OFF) di Jadwal agar potongan transport benar.`,
    );
  }

  const prev = await repo.findPreviousPayroll(employeeId, periodStart);
  if (prev) {
    const expectedStart = new Date(new Date(prev.periodEnd).getTime() + DAY_MS);
    if (new Date(periodStart) > expectedStart) {
      warnings.push(
        `Ada celah ${fmtDay(expectedStart)} – ${fmtDay(new Date(new Date(periodStart).getTime() - DAY_MS))} yang belum masuk payroll mana pun. ` +
        `Buat dulu payroll periode itu, atau gunakan mode "Rentang Tanggal" bila tanggal gajian karyawan diubah.`,
      );
    }
  }
  return { conflict, warnings };
};

/** Pratinjau periode sebelum generate (dialog Generate / Bulk Generate) */
const previewPeriod = async ({ employeeId, yearMonth, payDay, periodStart, periodEnd }) => {
  if (!employeeId && !payDay)
    throw new AppError("Pilih karyawan atau tanggal gajian", StatusCodes.BAD_REQUEST);
  const period = await resolveGeneratePeriod({ employeeId, yearMonth, payDay, periodStart, periodEnd });
  const { conflict, warnings } = employeeId
    ? await checkPeriodContinuity(employeeId, period.periodStart, period.periodEnd)
    : { conflict: null, warnings: [] };
  return { ...period, conflict, warnings };
};

const generate = async ({ employeeId, branchId, yearMonth, payDay, periodStart: ps, periodEnd: pe, notes }, createdBy) => {
  const { periodStart, periodEnd } = await resolveGeneratePeriod({ employeeId, yearMonth, payDay, periodStart: ps, periodEnd: pe });

  const { conflict, warnings } = await checkPeriodContinuity(employeeId, periodStart, periodEnd);
  if (conflict) throw new AppError(conflict, StatusCodes.CONFLICT);

  const { salarySetting, schedules, attendances, commissions, activeLoans, unusedLeavePayouts, approvedLatePermissions, holidays, omsetBonusTiers, branchOmset, employment } =
    await repo.getGenerationData(employeeId, branchId, periodStart, periodEnd);

  if (!salarySetting)
    throw new AppError("Pengaturan gaji aktif untuk karyawan ini belum ada. Atur di Settings → Gaji Karyawan.", StatusCodes.BAD_REQUEST);

  const { items, grossIncome, totalDeductions, netSalary } =
    buildItems(salarySetting, schedules, attendances, commissions, activeLoans, unusedLeavePayouts, approvedLatePermissions, holidays, omsetBonusTiers, branchOmset, periodStart, periodEnd, employment);

  const payroll = await prisma.$transaction(async (tx) => {
   const created = await tx.payroll.create({
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
   // Komisi di slip ini dicatat ke payroll ini → saat dibayar, hanya komisi ini yang jadi PAID
   if (commissions.length > 0) {
     const linked = await tx.commission.updateMany({
       where: { id: { in: commissions.map((c) => c.id) }, payrollId: null },
       data:  { payrollId: created.id },
     });
     // Komisi sempat diambil payroll lain (generate bersamaan) → batalkan agar tidak dibayar dua kali
     if (linked.count !== commissions.length) {
       throw new AppError("Sebagian komisi baru saja masuk payroll lain. Silakan generate ulang.", StatusCodes.CONFLICT);
     }
   }
   return created;
  });

  return { ...payroll, commissionBreakdown: buildCommissionBreakdown(commissions), warnings };
};

const recalculate = async (id, userId) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT")
    throw new AppError("Hanya payroll DRAFT yang bisa dihitung ulang", StatusCodes.BAD_REQUEST);

  const { salarySetting, schedules, attendances, commissions, activeLoans, unusedLeavePayouts, approvedLatePermissions, holidays, omsetBonusTiers, branchOmset, employment } =
    await repo.getGenerationData(existing.employeeId, existing.branchId, existing.periodStart, existing.periodEnd, id);

  if (!salarySetting)
    throw new AppError("Pengaturan gaji aktif untuk karyawan ini belum ada", StatusCodes.BAD_REQUEST);

  const { items, grossIncome, totalDeductions, netSalary } =
    buildItems(salarySetting, schedules, attendances, commissions, activeLoans, unusedLeavePayouts, approvedLatePermissions, holidays, omsetBonusTiers, branchOmset, existing.periodStart, existing.periodEnd, employment);

  const commissionIds = commissions.map((c) => c.id);
  // Item, komisi terhubung, dan total disimpan dalam satu transaksi agar selalu konsisten
  const updated = await prisma.$transaction(async (tx) => {
    await repo.replaceAutoItems(id, items, tx);
    // Lepas komisi yang tidak lagi memenuhi syarat, lalu hubungkan set terbaru
    await tx.commission.updateMany({
      where: { payrollId: id, status: "APPROVED", id: { notIn: commissionIds } },
      data:  { payrollId: null },
    });
    const linked = await tx.commission.updateMany({
      where: { id: { in: commissionIds }, OR: [{ payrollId: null }, { payrollId: id }] },
      data:  { payrollId: id },
    });
    if (linked.count !== commissionIds.length) {
      throw new AppError("Sebagian komisi baru saja masuk payroll lain. Silakan hitung ulang.", StatusCodes.CONFLICT);
    }
    return repo.update(id, {
      grossIncome,
      totalDeductions,
      netSalary,
      lastRecalculatedBy: userId ?? null,
      lastRecalculatedAt: new Date(),
    }, tx);
  });

  return { ...updated, commissionBreakdown: buildCommissionBreakdown(commissions) };
};

const submitForApproval = async (id, userId) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT")
    throw new AppError("Hanya payroll DRAFT yang bisa diajukan", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "PENDING_APPROVAL", submittedBy: userId ?? null, submittedAt: new Date() });
};

const approve = async (id, approvedBy) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "PENDING_APPROVAL")
    throw new AppError("Payroll tidak sedang menunggu persetujuan", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "APPROVED", approvedBy, approvedAt: new Date() });
};

const markAsPaid = async (id, paidBy) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "APPROVED")
    throw new AppError("Hanya payroll APPROVED yang bisa ditandai dibayar", StatusCodes.BAD_REQUEST);

  // Bug fix #4: kumpulkan loan yang baru PAID_OFF di dalam tx, sync setelah tx

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.payroll.update({
      where: { id },
      data: { status: "PAID", paidAt: now, paidBy: paidBy ?? null },
    });

    // Tandai PAID tepat komisi yang tercatat di slip ini (bukan menebak dari tanggal)
    await tx.commission.updateMany({
      where: { payrollId: id, status: "APPROVED" },
      data: { status: "PAID", paidAt: now, paidBy: paidBy ?? null },
    });

    const kasbonItems = existing.items.filter((i) => i.category === "kasbon" && i.type === "DEDUCTION");
    if (kasbonItems.length > 0) {
      const activeLoans = await tx.loan.findMany({ where: { employeeId: existing.employeeId, status: "ACTIVE" } });
      for (const loan of activeLoans) {
        // Bug fix #1: gunakan Math.min agar cicilan terakhir tidak overstated
        const repayAmt = Math.min(Number(loan.monthlyDeduction), Number(loan.remainingAmount));
        if (repayAmt <= 0) continue;
        const alreadyRepaid = await tx.loanRepayment.findFirst({ where: { loanId: loan.id, payrollId: id } });
        if (alreadyRepaid) continue;
        const newRemaining = Number(loan.remainingAmount) - repayAmt;
        const newStatus    = newRemaining <= 0 ? "PAID_OFF" : "ACTIVE";
        await tx.loanRepayment.create({
          data: { loanId: loan.id, payrollId: id, amount: repayAmt, paidAt: now },
        });
        await tx.loan.update({ where: { id: loan.id }, data: { remainingAmount: newRemaining, status: newStatus } });
      }
    }
  });

  // Enqueue Accurate sync — Jurnal Umum when payroll is PAID
  await createSyncJob({
    entityType: "PAYROLL",
    entityId:   id,
    direction:  "APP_TO_ACCURATE",
  });

  return repo.findById(id);
};

const updateNotes = async (id, notes) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);
  return repo.update(id, { notes });
};

// ── Employee self-service ─────────────────────────────────────────────────────

const getMy = async ({ employeeId, page = 1, limit = 20, year }) => {
  if (!employeeId) throw new AppError("Data karyawan untuk user ini tidak ditemukan", StatusCodes.BAD_REQUEST);
  const { skip, take } = paginate(page, limit);
  const where = { employeeId, status: { in: ["APPROVED", "PAID"] } };

  // Optional year filter — match payrolls whose periodStart falls within the year
  if (year) {
    where.periodStart = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lte: new Date(Date.UTC(year, 11, 31)),
    };
  }

  const [rows, total] = await Promise.all([
    repo.findByEmployee({ skip, take, where }),
    repo.countByEmployee(where),
  ]);

  // Batch: komisi semua slip di halaman ini dalam SATU query (lewat payrollId, hindari N+1)
  let data;
  if (rows.length === 0) {
    data = [];
  } else {
    const allCommissions = await prisma.commission.findMany({
      where: { payrollId: { in: rows.map((p) => p.id) } },
      select: {
        id: true, commissionAmount: true, approvedAt: true, payrollId: true,
        treatmentAssignment: {
          select: { treatmentItem: { select: { item: { select: { name: true } } } } },
        },
      },
    });

    data = rows.map((p) => {
      const commissions = allCommissions.filter((c) => c.payrollId === p.id);
      return { ...p, commissionBreakdown: buildCommissionBreakdown(commissions) };
    });
  }

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
  if (!yearMonth) throw new AppError("Pilih bulan gaji", StatusCodes.BAD_REQUEST);

  const employees = await repo.findEmployeesForBulkGenerate({ branchId, payDay: payDay ? Number(payDay) : undefined });

  const results = [];
  for (const emp of employees) {
    try {
      const payroll = await generate(
        { employeeId: emp.id, branchId: emp.homeBranchId ?? branchId, yearMonth, payDay: emp.payDay ?? undefined, notes },
        createdBy,
      );
      results.push({ employeeId: emp.id, employeeName: emp.name, employeeCode: emp.employeeCode, status: "created", payrollId: payroll.id, warnings: payroll.warnings });
    } catch (err) {
      results.push({ employeeId: emp.id, employeeName: emp.name, employeeCode: emp.employeeCode, status: "error", message: err.message });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const errors  = results.filter((r) => r.status === "error").length;

  return { results, summary: { total: employees.length, created, errors } };
};

const deletePayroll = async (id) => {
  const payroll = await repo.findById(id);
  if (!payroll) throw new AppError("Payroll tidak ditemukan", StatusCodes.NOT_FOUND);

  await prisma.$transaction(async (tx) => {
    // Jika PAID: revert komisi → APPROVED dan balik kasbon
    if (payroll.status === "PAID") {
      await tx.commission.updateMany({
        where: { payrollId: id, status: "PAID" },
        data:  { status: "APPROVED", paidAt: null, paidBy: null },
      });

      const repayments = await tx.loanRepayment.findMany({ where: { payrollId: id } });
      for (const rep of repayments) {
        await tx.loan.update({
          where: { id: rep.loanId },
          data:  { remainingAmount: { increment: Number(rep.amount) }, status: "ACTIVE" },
        });
      }
      await tx.loanRepayment.deleteMany({ where: { payrollId: id } });
    }

    // Lepas semua komisi dari payroll ini → bisa diambil payroll berikutnya
    await tx.commission.updateMany({ where: { payrollId: id }, data: { payrollId: null } });
    await tx.payrollItem.deleteMany({ where: { payrollId: id } });
    await tx.payroll.delete({ where: { id } });
  });

  return { deleted: true };
};

module.exports = {
  getAll, getById, generate, previewPeriod, recalculate, submitForApproval, approve,
  markAsPaid, updateNotes, getMy, getBpjsReport, bulkGenerate, deletePayroll,
};
