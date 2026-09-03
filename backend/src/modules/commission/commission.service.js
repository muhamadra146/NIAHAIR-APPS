const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy }           = require("../../utils/sort");

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
} = require("./commission.repository");
const {
  D,
  isSameDayWIB,
  sumWorkQty,
  distributePool,
  canOverride,
  canRegenerate,
} = require("./commission.calc");

// ── Management ────────────────────────────────────────────────────────

const listCommissions = async ({
  page, limit, employeeId, status, branchId, invoiceId, startDate, endDate, sortBy,
}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);
  const where = {};

  if (employeeId) where.employeeId = employeeId;
  if (status)     where.status     = status;
  if (invoiceId)  where.invoiceId  = invoiceId;
  if (branchId)   where.invoice    = { branchId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate)   where.createdAt.lte = new Date(endDate);
  }

  const [commissions, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
    count(where),
  ]);

  return { data: commissions, meta: paginationMeta(total, pageNum, limitNum) };
};

const getCommissionById = async (id) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Commission not found", StatusCodes.NOT_FOUND);
  return commission;
};

const approveCommission = async (id, userId) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Commission not found", StatusCodes.NOT_FOUND);

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
  if (!commission) throw new AppError("Commission not found", StatusCodes.NOT_FOUND);

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

// ── Job-slot path (sistem baru) ───────────────────────────────────────
//
// Dua sub-engine:
//
// A. LAMA (backward compat): slot tanpa roleId, pakai commissionMode (FIXED_RATE/WORK_QTY)
//    FIXED_RATE: 1 staff, komisi = subtotal × rate%
//    WORK_QTY  : banyak staff, dibagi proporsional by helaian
//
// B. BARU (role group engine): slot dengan roleId
//    rolePool = role.commissionRate% × subtotal
//    FLAT slots: deducted from pool, manual Rp input per treatment
//    MAIN slot : dapat sisa pool = rolePool - sum(flatAmounts)
//                jika banyak staff → split by helaian (workQty)

// Helper — proses satu slot dengan engine lama (FIXED_RATE / WORK_QTY)
function _processLegacySlot({ slot, assignments, invoice, invoiceItem, baseAmount, treatmentItem, forfeitReason, sessionForfeited }) {
  const rows = [];
  const rate  = D(slot.commissionRate);
  const pool  = baseAmount.mul(rate).div(D(100));

  if (slot.commissionMode === "FIXED_RATE") {
    const ja = assignments[0];
    const commissionAmount = ja.commissionAmount != null
      ? D(String(ja.commissionAmount))
      : pool.toDecimalPlaces(2);

    rows.push({
      invoiceId:                invoice.id,
      invoiceItemId:            invoiceItem?.id ?? null,
      treatmentAssignmentId:    null,
      treatmentJobAssignmentId: ja.id,
      serviceJobSlotId:         ja.serviceJobSlotId,
      employeeId:               ja.employeeId,
      serviceItemId:            treatmentItem.itemId,
      commissionRuleId:         null,
      commissionType:           "PERCENTAGE",
      commissionValue:          slot.commissionRate,
      commissionBase:           "AFTER_DISCOUNT_BEFORE_TAX",
      workQty:                  null,
      workRatio:                null,
      baseAmount,
      commissionAmount,
      status:                   "PENDING",
      isForfeit:                sessionForfeited,
      forfeitReason,
    });
  } else {
    // WORK_QTY
    const totalQty      = assignments.reduce((s, ja) => s.add(D(ja.workQty ?? 0)), D(0));
    const allHaveManual = assignments.every((ja) => ja.commissionAmount != null);
    if (!allHaveManual && totalQty.isZero()) return rows;

    const amounts = totalQty.isZero()
      ? assignments.map(() => D(0))
      : distributePool(pool, assignments.map((ja) => ({ workQty: ja.workQty ?? 0 })));

    for (let i = 0; i < assignments.length; i++) {
      const ja        = assignments[i];
      const workQty   = D(ja.workQty ?? 0);
      const workRatio = totalQty.isZero() ? D(0) : workQty.div(totalQty);
      const commissionAmount = ja.commissionAmount != null
        ? D(String(ja.commissionAmount))
        : amounts[i];

      rows.push({
        invoiceId:                invoice.id,
        invoiceItemId:            invoiceItem?.id ?? null,
        treatmentAssignmentId:    null,
        treatmentJobAssignmentId: ja.id,
        serviceJobSlotId:         ja.serviceJobSlotId,
        employeeId:               ja.employeeId,
        serviceItemId:            treatmentItem.itemId,
        commissionRuleId:         null,
        commissionType:           "PERCENTAGE",
        commissionValue:          slot.commissionRate,
        commissionBase:           "AFTER_DISCOUNT_BEFORE_TAX",
        workQty,
        workRatio,
        baseAmount,
        commissionAmount,
        status:                   "PENDING",
        isForfeit:                sessionForfeited,
        forfeitReason,
      });
    }
  }

  return rows;
}

// Helper — row builder (reused by both engines)
function _makeRow({ invoice, invoiceItem, treatmentItem, ja, slot, workQty, workRatio, commissionAmount, forfeitReason, sessionForfeited }) {
  return {
    invoiceId:                invoice.id,
    invoiceItemId:            invoiceItem?.id ?? null,
    treatmentAssignmentId:    null,
    treatmentJobAssignmentId: ja.id,
    serviceJobSlotId:         ja.serviceJobSlotId,
    employeeId:               ja.employeeId,
    serviceItemId:            treatmentItem.itemId,
    commissionRuleId:         null,
    commissionType:           "PERCENTAGE",
    commissionValue:          slot.commissionRate,
    commissionBase:           "AFTER_DISCOUNT_BEFORE_TAX",
    workQty:                  workQty ?? null,
    workRatio:                workRatio ?? null,
    baseAmount: invoiceItem ? D(invoiceItem.subtotal) : D(treatmentItem.priceSnapshot),
    commissionAmount,
    status:                   "PENDING",
    isForfeit:                sessionForfeited,
    forfeitReason,
  };
}

function _buildJobSlotRows({ invoice, session, treatmentItem, forfeitReason, sessionForfeited }) {
  const invoiceItem = invoice.items.find((ii) => ii.itemId === treatmentItem.itemId) ?? null;
  const baseAmount  = invoiceItem ? D(invoiceItem.subtotal) : D(treatmentItem.priceSnapshot);

  // Grup job assignments berdasarkan slot
  const bySlot = new Map();
  for (const ja of treatmentItem.jobAssignments) {
    if (!ja.employeeId) continue;
    const slotId = ja.serviceJobSlotId;
    if (!bySlot.has(slotId)) bySlot.set(slotId, { slot: ja.serviceJobSlot, assignments: [] });
    bySlot.get(slotId).assignments.push(ja);
  }

  const rows = [];

  // Deteksi apakah ada slot dengan roleId (engine baru)
  const hasRoleSlots = [...bySlot.values()].some(({ slot }) => slot?.roleId != null);

  if (!hasRoleSlots) {
    // ── Engine lama: FIXED_RATE / WORK_QTY ──
    for (const { slot, assignments } of bySlot.values()) {
      rows.push(..._processLegacySlot({ slot, assignments, invoice, invoiceItem, baseAmount, treatmentItem, forfeitReason, sessionForfeited }));
    }
    return rows;
  }

  // ── Engine baru: role group ──
  // Pisahkan slot dengan roleId (baru) dan tanpa roleId (legacy)
  const roleGroups  = new Map();  // roleId → { role, flatEntries, mainEntries }
  const legacyEntries = [];

  for (const entry of bySlot.values()) {
    const { slot } = entry;
    if (!slot?.roleId) {
      legacyEntries.push(entry);
    } else {
      const rid = slot.roleId;
      if (!roleGroups.has(rid)) {
        roleGroups.set(rid, {
          role:         slot.serviceJobRole,
          flatEntries:  [],
          mainEntries:  [],
          otherEntries: [],
        });
      }
      const grp = roleGroups.get(rid);
      if (slot.slotType === "FLAT")       grp.flatEntries.push(entry);
      else if (slot.isMainJob)            grp.mainEntries.push(entry);
      else                                grp.otherEntries.push(entry);
    }
  }

  // Proses slot legacy yang ada di item yang juga punya role-slot
  for (const entry of legacyEntries) {
    rows.push(..._processLegacySlot({ ...entry, invoice, invoiceItem, baseAmount, treatmentItem, forfeitReason, sessionForfeited }));
  }

  // Proses setiap role group
  for (const { role, flatEntries, mainEntries, otherEntries } of roleGroups.values()) {
    const rolePool = baseAmount.mul(D(role.commissionRate)).div(D(100)).toDecimalPlaces(2);

    // ── FLAT slots — deduct dari pool, emit row langsung ──
    let flatTotal = D(0);
    for (const { slot, assignments: flatAssignments } of flatEntries) {
      for (const ja of flatAssignments) {
        const flatAmt = ja.commissionAmount != null
          ? D(String(ja.commissionAmount))
          : D(0);  // FLAT tanpa input → Rp 0 (admin harus isi manual)
        flatTotal = flatTotal.add(flatAmt);

        rows.push(_makeRow({
          invoice, invoiceItem, treatmentItem, ja, slot,
          workQty:          null,
          workRatio:        null,
          commissionAmount: flatAmt,
          forfeitReason, sessionForfeited,
        }));
      }
    }

    // ── MAIN slot — dapat sisa pool setelah FLAT dibayar ──
    const rawMain  = rolePool.sub(flatTotal);
    const mainPool = rawMain.isNegative() ? D(0) : rawMain;

    for (const { slot, assignments: mainAssignments } of mainEntries) {
      if (mainAssignments.length === 0) continue;

      if (mainAssignments.length === 1) {
        // Satu staff — dapat full mainPool (atau manual override)
        const ja  = mainAssignments[0];
        const amt = ja.commissionAmount != null
          ? D(String(ja.commissionAmount))
          : mainPool.toDecimalPlaces(2);

        rows.push(_makeRow({
          invoice, invoiceItem, treatmentItem, ja, slot,
          workQty:          ja.workQty ? D(ja.workQty) : null,
          workRatio:        null,
          commissionAmount: amt,
          forfeitReason, sessionForfeited,
        }));
      } else {
        // Banyak staff — split by helaian
        const totalQty      = mainAssignments.reduce((s, ja) => s.add(D(ja.workQty ?? 0)), D(0));
        const allHaveManual = mainAssignments.every((ja) => ja.commissionAmount != null);

        // Jika tidak ada manual dan tidak ada helaian → skip
        if (!allHaveManual && totalQty.isZero()) continue;

        const amounts = totalQty.isZero()
          ? mainAssignments.map(() => D(0))
          : distributePool(mainPool, mainAssignments.map((ja) => ({ workQty: ja.workQty ?? 0 })));

        for (let i = 0; i < mainAssignments.length; i++) {
          const ja        = mainAssignments[i];
          const workQty   = D(ja.workQty ?? 0);
          const workRatio = totalQty.isZero() ? D(0) : workQty.div(totalQty);
          const amt       = ja.commissionAmount != null
            ? D(String(ja.commissionAmount))
            : amounts[i];

          rows.push(_makeRow({
            invoice, invoiceItem, treatmentItem, ja, slot,
            workQty, workRatio, commissionAmount: amt,
            forfeitReason, sessionForfeited,
          }));
        }
      }
    }

    // ── PERCENTAGE slots bukan main (edge case — pakai engine lama) ──
    for (const entry of otherEntries) {
      rows.push(..._processLegacySlot({ ...entry, invoice, invoiceItem, baseAmount, treatmentItem, forfeitReason, sessionForfeited }));
    }
  }

  return rows;
}

// ── Legacy workQty path (sistem lama) ────────────────────────────────
//
// Digunakan ketika item tidak memiliki ServiceJobSlot (backward compat).

async function _buildLegacyRows({ invoice, session, treatmentItem, forfeitReason, sessionForfeited, tx }) {
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
        serviceJobSlotId:         null,
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
        isForfeit:                sessionForfeited,
        forfeitReason,
      });
    }
  }
  return rows;
}

// ── Sistem kategori-job (sistem terbaru) ─────────────────────────────
//
// TreatmentJobAssignment.commissionJobId → lookup CommissionRule per
// (employee + category + job) → komisI per job per staff, independen.

async function _buildCategoryJobRows({ invoice, session, treatmentItem, forfeitReason, sessionForfeited, tx }) {
  const invoiceDate          = invoice.invoiceDate;
  const commissionCategoryId = treatmentItem.item?.commissionCategoryId;
  if (!commissionCategoryId) return [];

  const invoiceItem = invoice.items.find((ii) => ii.itemId === treatmentItem.itemId) ?? null;

  const jobAssignments = (treatmentItem.jobAssignments ?? []).filter(
    (ja) => ja.commissionJobId && ja.employeeId
  );
  if (jobAssignments.length === 0) return [];

  const rows = [];

  for (const ja of jobAssignments) {
    // Cari rule: employee + category + job, aktif pada tanggal invoice
    const rule = await (tx ?? require("../../config/prisma")).commissionRule.findFirst({
      where: {
        employeeId:           ja.employeeId,
        commissionCategoryId,
        commissionJobId:      ja.commissionJobId,
        isActive:             true,
        effectiveDate:        { lte: invoiceDate },
        OR: [{ endDate: null }, { endDate: { gte: invoiceDate } }],
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (!rule) continue;

    let baseAmount;
    if (invoiceItem) {
      baseAmount = resolveBaseAmount(invoiceItem, rule.commissionBase, invoice.inclusiveTax ?? false);
    } else {
      baseAmount = D(treatmentItem.priceSnapshot ?? 0);
    }

    const commissionAmount =
      rule.commissionType === "PERCENTAGE"
        ? D(baseAmount).mul(D(rule.commissionValue)).div(100)
        : D(rule.commissionValue);

    rows.push({
      invoiceId:                invoice.id,
      invoiceItemId:            invoiceItem?.id ?? null,
      treatmentAssignmentId:    null,
      treatmentJobAssignmentId: ja.id,
      serviceJobSlotId:         null,
      employeeId:               ja.employeeId,
      serviceItemId:            treatmentItem.itemId,
      commissionRuleId:         rule.id,
      commissionType:           rule.commissionType,
      commissionValue:          rule.commissionValue,
      commissionBase:           rule.commissionBase,
      workQty:                  null,
      workRatio:                D(1),
      baseAmount,
      commissionAmount,
      status:                   "PENDING",
      isForfeit:                sessionForfeited,
      forfeitReason,
    });
  }

  return rows;
}

async function _buildRows(invoice, tx) {
  const invoiceDate = invoice.invoiceDate;
  const rows        = [];

  for (const session of invoice.treatmentSessions) {
    const sessionForfeited =
      session.completedAt == null ||
      !isSameDayWIB(session.completedAt, invoiceDate);

    const forfeitReason = sessionForfeited
      ? `Treatment selesai ${
          session.completedAt
            ? session.completedAt.toISOString()
            : "(null)"
        } ≠ invoiceDate ${invoiceDate} (WIB)`
      : null;

    for (const treatmentItem of session.treatmentItems) {
      const hasJobSlots    = (treatmentItem.item?.serviceJobSlots?.length ?? 0) > 0;
      const hasJobAssignments = (treatmentItem.jobAssignments ?? []).some(ja => ja.commissionJobId);

      let itemRows;
      if (hasJobAssignments) {
        // ── Sistem kategori-job: TreatmentJobAssignment dengan commissionJobId ──
        itemRows = await _buildCategoryJobRows({ invoice, session, treatmentItem, forfeitReason, sessionForfeited, tx });
      } else if (hasJobSlots) {
        // ── Sistem ServiceJobSlot based ──
        itemRows = _buildJobSlotRows({ invoice, session, treatmentItem, forfeitReason, sessionForfeited });
      } else {
        // ── Sistem lama: workQty / TreatmentAssignment based ──
        itemRows = await _buildLegacyRows({ invoice, session, treatmentItem, forfeitReason, sessionForfeited, tx });
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
    if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

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
    if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

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

const overrideCommission = async (id, { commissionAmount, userId, notes }) => {
  const commission = await findById(id);
  if (!commission) throw new AppError("Commission not found", StatusCodes.NOT_FOUND);

  if (!canOverride(commission.status)) {
    throw new AppError(
      `Cannot override: commission status is ${commission.status}. Hanya PENDING/APPROVED yang bisa di-override.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

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
    const { count } = await deleteAllByInvoice(commission.invoiceId);
    return { invoiceId: commission.invoiceId, deleted: count, message: "Semua komisi invoice ini berhasil direset" };
  }

  await deleteOne(id);
  return { id, message: "Komisi berhasil dihapus" };
};

module.exports = {
  listCommissions,
  getCommissionById,
  approveCommission,
  markCommissionPaid,
  generateCommission,
  regenerateCommission,
  overrideCommission,
  deleteCommission,
};
