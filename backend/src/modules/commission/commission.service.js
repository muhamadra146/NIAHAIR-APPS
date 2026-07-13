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
      const commissionCategoryId = treatmentItem.item?.commissionCategoryId;
      if (!commissionCategoryId) continue;

      const totalWork = sumWorkQty(treatmentItem.assignments);
      if (totalWork.isZero()) continue;

      const invoiceItem =
        invoice.items.find((ii) => ii.itemId === treatmentItem.itemId) ?? null;

      // ── Phase 1: resolve rules ──────────────────────────────────────
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

      if (resolved.length === 0) continue;

      // ── Phase 2: group by rate signature ───────────────────────────
      // Assignments dengan (commissionType, commissionValue, commissionBase)
      // yang sama berbagi pool — menjamin sum yang benar setelah rounding.
      const groups = new Map();
      for (const { assignment, rule } of resolved) {
        const key = `${rule.commissionType}|${String(rule.commissionValue)}|${rule.commissionBase ?? "AFTER_DISCOUNT"}`;
        if (!groups.has(key)) groups.set(key, { rule, assignments: [] });
        groups.get(key).assignments.push(assignment);
      }

      // ── Phase 3: distribute pool per group ─────────────────────────
      for (const { rule, assignments: ga } of groups.values()) {
        let baseAmount;
        if (invoiceItem) {
          baseAmount =
            rule.commissionBase === "BEFORE_DISCOUNT"
              ? D(invoiceItem.price).mul(D(invoiceItem.qty))
              : D(invoiceItem.subtotal);
        } else {
          baseAmount = D(treatmentItem.priceSnapshot);
        }

        // Pool = baseAmount × (groupWork/totalWork) × rate
        const groupWork  = sumWorkQty(ga);
        const groupShare = groupWork.div(totalWork);

        const pool =
          rule.commissionType === "PERCENTAGE"
            ? D(baseAmount).mul(groupShare).mul(D(rule.commissionValue)).div(100)
            : D(rule.commissionValue).mul(groupShare);

        const amounts = distributePool(pool, ga);

        for (let i = 0; i < ga.length; i++) {
          const assignment     = ga[i];
          const commissionAmount = amounts[i];
          // workRatio = referensi auditing (terhadap totalWork keseluruhan)
          const workRatio = D(assignment.workQty).div(totalWork);

          rows.push({
            invoiceId:             invoice.id,
            invoiceItemId:         invoiceItem?.id ?? null,
            treatmentAssignmentId: assignment.id,
            employeeId:            assignment.employeeId,
            serviceItemId:         treatmentItem.itemId,
            commissionRuleId:      rule.id,
            commissionType:        rule.commissionType,
            commissionValue:       rule.commissionValue,
            commissionBase:        rule.commissionBase,
            workQty:               assignment.workQty,
            workRatio,
            baseAmount,
            commissionAmount,
            status:                "PENDING",
            isForfeit:             sessionForfeited,
            forfeitReason,
          });
        }
      }
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
