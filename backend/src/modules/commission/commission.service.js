const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy }           = require("../../utils/sort");
const { wibDayStart, wibDayEnd }   = require("../../utils/date");
const { resolvePayPeriod } = require("../../utils/payPeriod");

const ORDER_MAP = {
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  amount:       { amount: "asc" },
  "-amount":    { amount: "desc" },
  status:       { status: "asc" },
  "-status":    { status: "desc" },
};
const {
  // management
  findAll,
  count,
  findById,
  approveOne,
  markPaidOne,
  deleteOne,
  overrideOne,
  // generator / regenerator
  withTransaction,
  findInvoiceForGeneration,
  findActiveRuleForGeneration,
  countByInvoice,
  bulkCreate,
  findAllByInvoice,
  deletePendingByInvoice,
  findPayrollsContainingCommissions,
  deleteAllByInvoice,
  sumByStatus,
  findEmployeePayDay,
  findPayrollForPeriod,
} = require("./commission.repository");
const {
  D,
  sumWorkQty,
  distributePool,
  canOverride,
  canRegenerate,
  calcCategoryItem,
  resolveJobDefaultRate,
} = require("./commission.calc");
const { findActiveByEmployeeAndJob } = require("../commissionRule/commissionRule.repository");

// ── Management ────────────────────────────────────────────────────────

const listCommissions = async ({
  page, limit, employeeId, status, branchId, invoiceId, startDate, endDate, sortBy, extraWhere,
}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);
  const where = { ...(extraWhere ?? {}) };

  if (employeeId) where.employeeId = employeeId;
  if (status)     where.status     = status;
  if (invoiceId)  where.invoiceId  = invoiceId;
  if (branchId)   where.invoice    = { branchId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = wibDayStart(startDate);
    if (endDate)   where.createdAt.lte = wibDayEnd(endDate);
  }

  const [commissions, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
    count(where),
  ]);

  return { data: commissions, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Komisi Saya: periode gaji (COM-017) ───────────────────────────────
//
// Sama dengan payroll:
//   · Nama gaji = bulan kerja; periode mengikuti tanggal gajian karyawan (utils/payPeriod).
//   · Payroll mengambil SEMUA komisi APPROVED yang belum masuk payroll, disetujui s/d akhir periode
//     (termasuk sisa periode lalu), dan mencatatnya lewat payrollId.
// Kartu periode P:
//   pending = semua PENDING (belum punya periode)
//   ready   = payroll P sudah dibuat → APPROVED yang tercatat di slip P
//             payroll P belum dibuat → APPROVED belum masuk slip mana pun, disetujui s/d akhir P
//             (= persis yang akan diambil saat payroll P dibuat; carryOver = disetujui sebelum P)
//   paid    = PAID yang tercatat di slip gaji periode P
//   total   = pending + ready + paid
//   queued  = (payroll P sudah dibuat) APPROVED yang belum masuk slip mana pun → ikut gaji berikutnya

const assertEmployee = (employeeId) => {
  if (!employeeId)
    throw new AppError("Akun ini tidak terhubung ke data karyawan", StatusCodes.FORBIDDEN);
};

const assertYearMonth = (yearMonth) => {
  if (yearMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth))
    throw new AppError("Format periode harus YYYY-MM", StatusCodes.BAD_REQUEST);
};

const myPayPeriod = async (employeeId, yearMonth) => {
  const payDay = await findEmployeePayDay(employeeId);
  const period = resolvePayPeriod(payDay, yearMonth);
  const payroll = await findPayrollForPeriod(employeeId, period.periodStart, period.periodEnd);
  return {
    ...period,
    payroll,
    startTs: wibDayStart(period.periodStart),
    endTs:   wibDayEnd(period.periodEnd),
  };
};

const periodWhere = (period) => ({
  pending: { status: "PENDING" },
  ready:   period.payroll
    ? { status: "APPROVED", payrollId: period.payroll.id }
    : { status: "APPROVED", payrollId: null, approvedAt: { lte: period.endTs } },
  paid:    { status: "PAID", payroll: { periodStart: { gte: period.periodStart, lte: period.periodEnd } } },
});

// Self-service: employeeId selalu dari user login, tidak bisa di-override via query
const listMyCommissions = async (employeeId, { page, limit, status, branchId, startDate, endDate, sortBy, yearMonth }) => {
  assertEmployee(employeeId);
  assertYearMonth(yearMonth);
  if (!yearMonth) {
    return listCommissions({ page, limit, employeeId, status, branchId, startDate, endDate, sortBy });
  }
  const w = periodWhere(await myPayPeriod(employeeId, yearMonth));
  const extraWhere =
    status === "PENDING"  ? w.pending :
    status === "APPROVED" ? w.ready   :
    status === "PAID"     ? w.paid    :
    { OR: [w.pending, w.ready, w.paid] };
  // status sudah tercakup di extraWhere
  return listCommissions({ page, limit, employeeId, branchId, sortBy, extraWhere });
};

const toBucket = (groups, status) => {
  const g = groups.find((x) => x.status === status);
  return { count: g?._count?._all ?? 0, amount: Number(g?._sum?.commissionAmount ?? 0) };
};

/** Ringkasan Komisi Saya per periode gaji (bulan kerja). */
const getMyCommissionSummary = async (employeeId, { yearMonth } = {}) => {
  assertEmployee(employeeId);
  assertYearMonth(yearMonth);
  const period = await myPayPeriod(employeeId, yearMonth);
  const w = periodWhere(period);

  const unscheduled = { status: "APPROVED", payrollId: null };
  const [pendingG, readyG, paidG, carryG, queuedG] = await Promise.all([
    sumByStatus({ employeeId, ...w.pending }),
    sumByStatus({ employeeId, ...w.ready }),
    sumByStatus({ employeeId, ...w.paid }),
    period.payroll ? [] : sumByStatus({ employeeId, ...unscheduled, approvedAt: { lt: period.startTs } }),
    period.payroll ? sumByStatus({ employeeId, ...unscheduled }) : [],
  ]);

  const pending = toBucket(pendingG, "PENDING");
  const ready   = { ...toBucket(readyG, "APPROVED"), carryOver: toBucket(carryG, "APPROVED") };
  const paid    = toBucket(paidG, "PAID");
  const queued  = toBucket(queuedG, "APPROVED");

  return {
    period: {
      yearMonth:   period.yearMonth,
      payDay:      period.payDay,
      periodStart: period.periodStart,
      periodEnd:   period.periodEnd,
      payDate:     period.payDate,
      payrollStatus: period.payroll?.status ?? null,
    },
    pending,
    ready,
    paid,
    queued,
    total: {
      count:  pending.count + ready.count + paid.count,
      amount: pending.amount + ready.amount + paid.amount,
    },
  };
};
const getCommissionById = async (id) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  return commission;
};

const approveCommission = async (id, userId) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  if (commission.status !== "PENDING") {
    throw new AppError(
      `Cannot approve: status is ${commission.status}, expected PENDING`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return approveOne(id, userId);
};

const markCommissionPaid = async (id, userId) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  if (commission.status !== "APPROVED") {
    throw new AppError(
      `Cannot mark paid: status is ${commission.status}, expected APPROVED`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return markPaidOne(id, userId);
};

// ── Commission base resolver ──────────────────────────────────────────
//
// 4 opsi dasar komisi:
//   BEFORE_DISCOUNT_BEFORE_TAX : harga sebelum diskon & sebelum pajak  = price×qty ÷ (1 + taxRate%)
//   AFTER_DISCOUNT_BEFORE_TAX  : harga sesudah diskon & sebelum pajak  = subtotal
//   BEFORE_DISCOUNT_AFTER_TAX  : harga sebelum diskon & sesudah pajak  = price×qty
//   AFTER_DISCOUNT_AFTER_TAX   : harga sesudah diskon & sesudah pajak  = price×qty - discount
//
// Backward compat: nilai lama BEFORE_DISCOUNT → BEFORE_DISCOUNT_AFTER_TAX
//                               AFTER_DISCOUNT → AFTER_DISCOUNT_BEFORE_TAX

// resolveBaseAmount — hitung dasar komisi berdasarkan opsi dan tipe PPN invoice.
//
// inclusiveTax = true  (PPN Pengurangan): price sudah include PPN.
//   → "sebelum pajak" = price ÷ (1 + taxRate%)   [strip pajak dari harga]
//   → "sesudah pajak" = price                      [harga apa adanya]
//   → subtotal field  = DPP (sesudah diskon, sebelum pajak)
//
// inclusiveTax = false (PPN Penambahan): price belum include PPN.
//   → "sebelum pajak" = price                      [harga apa adanya = DPP]
//   → "sesudah pajak" = price × (1 + taxRate%)     [tambah pajak ke harga]
//   → subtotal field  = price×qty - discount        [sebelum pajak juga]

function resolveBaseAmount(invoiceItem, commissionBase, inclusiveTax) {
  const price     = D(invoiceItem.price);
  const qty       = D(invoiceItem.qty);
  const discount  = D(invoiceItem.discount ?? 0);
  const subtotal  = D(invoiceItem.subtotal);
  const taxRate   = D(invoiceItem.taxRate  ?? 0);
  const taxFactor = D(1).add(taxRate.div(D(100)));  // mis. 1.11 untuk PPN 11%

  // gross = price × qty (termasuk/tidaknya pajak tergantung inclusiveTax)
  const gross            = price.mul(qty);
  const grossAfterDisc   = gross.sub(discount);

  switch (commissionBase) {
    case "BEFORE_DISCOUNT_BEFORE_TAX":
      // DPP sebelum diskon
      if (!inclusiveTax) return gross;                                    // price = DPP
      return taxRate.gt(D(0)) ? gross.div(taxFactor).toDecimalPlaces(2) : gross;

    case "AFTER_DISCOUNT_BEFORE_TAX":
      // DPP sesudah diskon — subtotal selalu menyimpan nilai ini di kedua mode
      return subtotal;

    case "BEFORE_DISCOUNT_AFTER_TAX":
    case "BEFORE_DISCOUNT":           // backward compat
      // Harga sesudah pajak, sebelum diskon
      if (inclusiveTax) return gross;                                     // price sudah include pajak
      return taxRate.gt(D(0)) ? gross.mul(taxFactor).toDecimalPlaces(2) : gross;

    case "AFTER_DISCOUNT_AFTER_TAX":
      // Harga sesudah pajak, sesudah diskon
      if (inclusiveTax) return grossAfterDisc;                           // price sudah include pajak
      return taxRate.gt(D(0)) ? grossAfterDisc.mul(taxFactor).toDecimalPlaces(2) : grossAfterDisc;

    case "AFTER_DISCOUNT":            // backward compat
    default:
      return subtotal;
  }
}

// ── Generator (internal) ──────────────────────────────────────────────
//
// Rounding strategy:
//   Assignments pada treatment item yang sama DAN memiliki rate yang sama
//   dikelompokkan dalam satu "pool". Pool dihitung sekali (ROUND_HALF_UP ke 2dp),
//   lalu didistribusikan ke setiap anggota grup dengan ROUND_DOWN kecuali orang
//   terakhir yang mendapat sisa. Jaminan: sum(commissionAmount per grup) = pool.
//
// Siapa dapat sisa rupiah? Orang terakhir dalam urutan assignments dari DB.
//   Urutan tidak dimanipulasi — konsisten dengan urutan TreatmentAssignment.

// ── Legacy workQty path (sistem lama) ────────────────────────────────
//
// Digunakan ketika treatment item tidak memiliki job assignment kategori-job
// (berbasis TreatmentAssignment + workQty — backward compat).

async function _buildLegacyRows({ invoice, treatmentItem, tx }) {
  const invoiceDate          = invoice.invoiceDate;
  const commissionCategoryId = treatmentItem.item?.commissionCategoryId;
  if (!commissionCategoryId) return [];

  const totalWork = sumWorkQty(treatmentItem.assignments);
  if (totalWork.isZero()) return [];

  const maxWork    = D(treatmentItem.qty ?? 1).mul(D(treatmentItem.conversionSnapshot ?? 1));
  const invoiceItem = invoice.items.find((ii) => ii.itemId === treatmentItem.itemId) ?? null;

  // Phase 1: resolve rules
  const resolved = [];
  for (const assignment of treatmentItem.assignments) {
    const rule = await findActiveRuleForGeneration(
      assignment.employeeId,
      commissionCategoryId,
      assignment.slotKey ?? null,
      invoiceDate,
      tx
    );
    if (rule) resolved.push({ assignment, rule });
  }
  if (resolved.length === 0) return [];

  // Phase 2: group by rate signature
  const groups = new Map();
  for (const { assignment, rule } of resolved) {
    const key = `${rule.commissionType}|${String(rule.commissionValue)}|${rule.commissionBase ?? "AFTER_DISCOUNT_BEFORE_TAX"}`;
    if (!groups.has(key)) groups.set(key, { rule, assignments: [] });
    groups.get(key).assignments.push(assignment);
  }

  const rows = [];
  // Phase 3: distribute pool per group
  for (const { rule, assignments: ga } of groups.values()) {
    let baseAmount;
    if (invoiceItem) {
      baseAmount = resolveBaseAmount(invoiceItem, rule.commissionBase, invoice.inclusiveTax ?? false);
    } else {
      baseAmount = D(treatmentItem.priceSnapshot);
    }

    const groupWork  = sumWorkQty(ga);
    const groupShare = maxWork.isZero() ? D(0) : groupWork.div(maxWork);

    const pool =
      rule.commissionType === "PERCENTAGE"
        ? D(baseAmount).mul(groupShare).mul(D(rule.commissionValue)).div(100)
        : D(rule.commissionValue).mul(groupShare);

    const amounts = distributePool(pool, ga);

    for (let i = 0; i < ga.length; i++) {
      const assignment       = ga[i];
      const commissionAmount = amounts[i];
      const workRatio        = maxWork.isZero() ? D(0) : D(assignment.workQty).div(maxWork);

      rows.push({
        invoiceId:                invoice.id,
        invoiceItemId:            invoiceItem?.id ?? null,
        treatmentAssignmentId:    assignment.id,
        treatmentJobAssignmentId: null,
        employeeId:               assignment.employeeId,
        serviceItemId:            treatmentItem.itemId,
        commissionRuleId:         rule.id,
        commissionType:           rule.commissionType,
        commissionValue:          rule.commissionValue,
        commissionBase:           rule.commissionBase,
        workQty:                  assignment.workQty,
        workRatio,
        baseAmount,
        commissionAmount,
        status:                   "PENDING",
      });
    }
  }
  return rows;
}

// ── Sistem kategori-job (sistem terbaru) ─────────────────────────────
//
// TreatmentJobAssignment.commissionJobId → CommissionRule per (employee + category + job).
// Perhitungan SATU sumber: calcCategoryItem (commission.calc.js) — dipakai kalkulator
// (preview + finalize) dan regenerate, sehingga hasilnya selalu sama.

// Total staf unik yang assign di kategori yang sama dalam satu invoice
function _countStaffInCategory(invoice, commissionCategoryId) {
  const ids = new Set();
  for (const s of invoice.treatmentSessions ?? []) {
    for (const ti of s.treatmentItems ?? []) {
      if (ti.item?.commissionCategoryId !== commissionCategoryId) continue;
      for (const ja of ti.jobAssignments ?? []) if (ja.employeeId) ids.add(ja.employeeId);
    }
  }
  return ids.size;
}

/**
 * Hitung komisi satu treatment item (sistem kategori-job).
 * invoice harus memuat: invoiceDate, inclusiveTax, items[{id,itemId,qty,price,discount,subtotal,taxRate}],
 *   treatmentSessions[].treatmentItems[]
 * treatmentItem harus memuat: itemId, qty, conversionSnapshot, priceSnapshot,
 *   item.commissionCategory{id,name,jobs[JOB_CALC_SELECT]}, jobAssignments[{id,employeeId,commissionJobId,workQty,employee?}]
 * @returns null jika item tidak punya kategori / assignment
 */
async function calculateCategoryItem({ invoice, treatmentItem, qtyOverrides = {} }) {
  const cat = treatmentItem.item?.commissionCategory;
  if (!cat) return null;

  const jas = (treatmentItem.jobAssignments ?? []).filter((ja) => ja.commissionJobId && ja.employeeId);
  if (jas.length === 0) return null;

  const invoiceItem = (invoice.items ?? []).find((ii) => ii.itemId === treatmentItem.itemId) ?? null;
  const subtotal    = invoiceItem ? D(invoiceItem.subtotal) : D(treatmentItem.priceSnapshot ?? 0);
  // qty item dalam satuan konversi (mis. 1 TEBAL × 180 = 180 helai)
  const itemQty     = treatmentItem.qty != null
    ? Math.round(Number(treatmentItem.qty) * Number(treatmentItem.conversionSnapshot ?? 1))
    : null;
  const asOfDate    = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();
  const totalStaff  = _countStaffInCategory(invoice, cat.id);

  const jobs = [];
  for (const jobDef of cat.jobs ?? []) {
    const workersRaw = jas.filter((ja) => ja.commissionJobId === jobDef.id);
    if (workersRaw.length === 0) continue;

    // Tarif bawaan job (untuk staf tanpa rule) — tingkatan berdasarkan jumlah staf di kategori
    const jobRate = resolveJobDefaultRate(jobDef, totalStaff);
    const workers = await Promise.all(workersRaw.map(async (ja) => {
      // Rule per karyawan = pengecualian; jika tidak ada → tarif bawaan job
      const ownRule = await findActiveByEmployeeAndJob(ja.employeeId, cat.id, jobDef.id, asOfDate);
      const rule = ownRule ?? (jobRate && {
        id:              null,
        commissionType:  jobRate.commissionType,
        commissionValue: jobRate.commissionValue,
        commissionBase:  "AFTER_DISCOUNT_BEFORE_TAX",
      });
      // Base item menurut commissionBase rule staf (sebelum/sesudah diskon & pajak)
      const itemBase = rule && invoiceItem
        ? resolveBaseAmount(invoiceItem, rule.commissionBase, invoice.inclusiveTax ?? false)
        : subtotal;
      return {
        itemBase:         Number(D(itemBase).toFixed(2)),
        treatmentJobAssignmentId: ja.id,
        employeeId:       ja.employeeId,
        employeeName:     ja.employee?.name ?? "",
        workQty:          ja.workQty != null ? Number(ja.workQty) : null,
        commissionRuleId: rule?.id ?? null,
        commissionType:   rule?.commissionType ?? null,
        commissionValue:  rule?.commissionValue != null ? String(rule.commissionValue) : null,
        commissionBase:   rule?.commissionBase ?? null,
        rateSource:       ownRule ? "RULE" : jobRate ? "JOB" : null,
      };
    }));

    jobs.push({
      commissionJobId:  jobDef.id,
      jobName:          jobDef.name,
      jobKey:           jobDef.jobKey,
      sortOrder:        jobDef.sortOrder,
      deductsFromJobId: jobDef.deductsFromJobId ?? null,
      pricePerUnit:     jobDef.pricePerUnit != null ? Number(jobDef.pricePerUnit) : null,
      unit:             jobDef.unit || "helai",
      splitMode:        jobDef.splitMode ?? "BY_QTY",
      workers,
    });
  }
  if (jobs.length === 0) return null;

  return {
    invoiceItemId: invoiceItem?.id ?? null,
    category:      { id: cat.id, name: cat.name },
    subtotal:      Number(subtotal.toFixed(2)),
    itemQty,
    jobs:          calcCategoryItem({ subtotal, itemQty, jobs, qtyOverrides }),
  };
}

// Baris hasil kalkulasi → data Commission (dipakai finalize & regenerate)
// baseAmount disimpan = base milik staf (sisa base × porsi, atau qty × harga untuk helper);
// helper flat menyimpan base item.
function toCommissionData({ invoiceId, invoiceItemId, serviceItemId, row, commissionAmount }) {
  return {
    invoiceId,
    invoiceItemId:            invoiceItemId ?? null,
    treatmentAssignmentId:    null,
    treatmentJobAssignmentId: row.treatmentJobAssignmentId,
    employeeId:               row.employeeId,
    serviceItemId,
    commissionRuleId:         row.commissionRuleId,
    commissionType:           row.commissionType ?? "PERCENTAGE",
    commissionValue:          String(row.commissionValue ?? 0),
    commissionBase:           row.commissionBase ?? "AFTER_DISCOUNT_BEFORE_TAX",
    workQty:                  row.workQty != null ? String(row.workQty) : null,
    workRatio:                row.workRatio != null ? String(row.workRatio) : null,
    baseAmount:               String(row.effectiveBase > 0 ? row.effectiveBase : row.itemBase),
    commissionAmount:         String(commissionAmount ?? row.amount),
    status:                   "PENDING",
  };
}

async function _buildCategoryJobRows({ invoice, treatmentItem }) {
  const calc = await calculateCategoryItem({ invoice, treatmentItem });
  if (!calc) return [];

  return calc.jobs.flatMap((job) =>
    job.rows
      .filter((row) => row.hasRule)
      .map((row) => toCommissionData({
        invoiceId:     invoice.id,
        invoiceItemId: calc.invoiceItemId,
        serviceItemId: treatmentItem.itemId,
        row,
      })),
  );
}

// Komisi tidak pernah dihanguskan otomatis (COM-012) — tidak ada pengecekan
// tanggal selesai treatment vs tanggal invoice.
async function _buildRows(invoice, tx) {
  const rows = [];

  for (const session of invoice.treatmentSessions) {
    for (const treatmentItem of session.treatmentItems) {
      const hasJobAssignments = (treatmentItem.jobAssignments ?? []).some(ja => ja.commissionJobId);

      let itemRows;
      if (hasJobAssignments) {
        // ── Sistem kategori-job: TreatmentJobAssignment dengan commissionJobId ──
        itemRows = await _buildCategoryJobRows({ invoice, treatmentItem });
      } else {
        // ── Sistem lama: workQty / TreatmentAssignment based ──
        itemRows = await _buildLegacyRows({ invoice, treatmentItem, tx });
      }

      rows.push(...itemRows);
    }
  }

  return rows;
}

// ── Generate ──────────────────────────────────────────────────────────

const generateCommission = (invoiceId) =>
  withTransaction(async (tx) => {
    const invoice = await findInvoiceForGeneration(invoiceId, tx);
    if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);

    if (invoice.status !== "PAID") {
      throw new AppError(
        "Komisi hanya dapat di-generate setelah invoice lunas (PAID).",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const existing = await countByInvoice(invoiceId, tx);
    if (existing > 0) {
      throw new AppError(
        "Commissions already generated for this invoice. Use regenerateCommission to reset.",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const rows = await _buildRows(invoice, tx);
    if (rows.length === 0) return { created: 0 };

    await bulkCreate(rows, tx);
    return { created: rows.length };
  });

// ── Regenerate ────────────────────────────────────────────────────────
//
// Idempotency rules:
//   - Boleh regenerate jika SEMUA komisi untuk invoice ini masih PENDING
//   - TIDAK boleh jika ada yang sudah APPROVED atau PAID (data di-lock)
//   - Komisi lama PENDING dihapus dulu, lalu buat ulang dari awal
//
// Use case: nota diedit (tambah/hapus service, ubah harga) setelah generate pertama.

const regenerateCommission = (invoiceId) =>
  withTransaction(async (tx) => {
    const invoice = await findInvoiceForGeneration(invoiceId, tx);
    if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);

    // Ambil semua komisi existing di dalam tx — hindari race condition dengan deletePendingByInvoice
    const allExisting = await findAllByInvoice(invoiceId, tx);
    const { allowed, blockers } = canRegenerate(allExisting);

    if (!allowed) {
      const hasPaid     = blockers.some((b) => b.status === "PAID");
      const hasApproved = blockers.some((b) => b.status === "APPROVED");

      let reason;
      if (hasPaid) {
        reason = "Ada komisi yang sudah berstatus PAID — komisi ini sudah dibayarkan melalui payroll dan tidak dapat diubah.";
      } else if (hasApproved) {
        reason = "Ada komisi yang sudah disetujui (APPROVED) dan kemungkinan sudah masuk dalam kalkulasi payroll. Regenerate akan menghapus data tersebut.";
      } else {
        reason = `Ada komisi non-PENDING: ${blockers.map((b) => b.status).join(", ")}.`;
      }

      throw new AppError(
        `Tidak dapat regenerate komisi. ${reason} Hubungi admin jika perlu koreksi.`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    // Cek apakah ada komisi yang sudah masuk payroll APPROVED/PAID
    const payrollsAffected = await findPayrollsContainingCommissions(allExisting, tx);
    if (payrollsAffected.length > 0) {
      const payrollIds = payrollsAffected.map((p) => p.id).join(", ");
      throw new AppError(
        `Tidak dapat regenerate: komisi ini sudah termasuk dalam payroll yang disetujui atau dibayar [${payrollIds}]. Batalkan payroll tersebut terlebih dahulu.`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    // Hapus PENDING lama
    await deletePendingByInvoice(invoiceId, tx);

    // Buat ulang
    const rows = await _buildRows(invoice, tx);
    if (rows.length === 0) return { deleted: allExisting.length, created: 0 };

    await bulkCreate(rows, tx);
    return { deleted: allExisting.length, created: rows.length };
  });

// ── Override ──────────────────────────────────────────────────────────
//
// Override menang atas forfeit: SUPER_ADMIN dapat mengoreksi komisi yang
// dianggap hangus oleh sistem secara otomatis. Setelah override:
//   - isForfeit menjadi false
//   - forfeitReason dihapus
//   - isManualOverride = true, overrideBy/overrideAt/overrideNotes dicatat
//
// Override TIDAK diizinkan jika status = PAID. Pembatalan PAID butuh proses
// tersendiri (reversal) yang belum diimplementasi.

/** Komisi yang sudah tercatat di slip payroll tidak boleh diubah/dihapus (slip & komisi harus sama) */
const assertNotInPayroll = (commissions) => {
  if (commissions.some((c) => c.payrollId)) {
    throw new AppError(
      "Komisi sudah tercatat di payroll. Hapus payroll tersebut dulu agar komisi dilepas, lalu ubah komisinya.",
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};

const overrideCommission = async (id, { commissionAmount, userId, notes }) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  if (!canOverride(commission.status)) {
    throw new AppError(
      `Komisi berstatus ${commission.status} tidak bisa di-override. Hanya PENDING/APPROVED yang bisa di-override.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  assertNotInPayroll([commission]);

  if (Number(commissionAmount) < 0) {
    throw new AppError("commissionAmount tidak boleh negatif", StatusCodes.BAD_REQUEST);
  }

  return overrideOne(id, {
    commissionAmount,
    overrideBy:    userId,
    overrideNotes: notes,
  });
};

const deleteCommission = async (id, roleCode) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  if (!isSuperAdmin && commission.status !== "PENDING") {
    throw new AppError(
      `Komisi tidak bisa dihapus karena statusnya ${commission.status}. Hanya PENDING yang bisa dihapus.`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  // SUPER_ADMIN: hapus SEMUA komisi invoice agar status kembali ke "belum generate"
  if (isSuperAdmin) {
    assertNotInPayroll(await findAllByInvoice(commission.invoiceId));
    const { count } = await deleteAllByInvoice(commission.invoiceId);
    return { invoiceId: commission.invoiceId, deleted: count, message: "Semua komisi invoice ini berhasil direset" };
  }

  await deleteOne(id);
  return { id, message: "Komisi berhasil dihapus" };
};

module.exports = {
  // kalkulasi kategori-job (dipakai invoice worksheet/finalize)
  calculateCategoryItem,
  toCommissionData,
  listCommissions,
  listMyCommissions,
  getMyCommissionSummary,
  getCommissionById,
  approveCommission,
  markCommissionPaid,
  generateCommission,
  regenerateCommission,
  overrideCommission,
  deleteCommission,
};
