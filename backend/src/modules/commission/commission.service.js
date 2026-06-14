const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  // management
  findAll,
  count,
  findById,
  approveOne,
  markPaidOne,
  // generator
  withTransaction,
  findInvoiceForGeneration,
  findActiveRuleForGeneration,
  countByInvoice,
  bulkCreate,
} = require("./commission.repository");

// ── Money helper ──────────────────────────────────────────────────────

const D = (v) => new Prisma.Decimal(String(v));

// ── Management ────────────────────────────────────────────────────────

const listCommissions = async ({ page, limit, employeeId, status, branchId, invoiceId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
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
    findAll({ skip, take, where }),
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

// ── Generator ─────────────────────────────────────────────────────────

const generateCommission = (invoiceId) =>
  withTransaction(async (tx) => {
    const invoice = await findInvoiceForGeneration(invoiceId, tx);
    if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

    const existing = await countByInvoice(invoiceId, tx);
    if (existing > 0) {
      throw new AppError(
        "Commissions already generated for this invoice",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const rows = [];

    for (const session of invoice.treatmentSessions) {
      for (const treatmentItem of session.treatmentItems) {
        const commissionCategoryId = treatmentItem.item.commissionCategoryId;
        if (!commissionCategoryId) continue;

        const totalWork = D(treatmentItem.qty).mul(D(treatmentItem.conversionSnapshot));
        if (totalWork.isZero()) continue;

        const invoiceItem =
          invoice.items.find((ii) => ii.itemId === treatmentItem.itemId) ?? null;

        for (const assignment of treatmentItem.assignments) {
          const rule = await findActiveRuleForGeneration(
            assignment.employeeId,
            commissionCategoryId,
            assignment.slotKey ?? null,
            tx
          );
          if (!rule) continue;

          const workQty   = D(assignment.workQty);
          const workRatio = workQty.div(totalWork);

          let baseAmount;
          if (invoiceItem) {
            baseAmount =
              rule.commissionBase === "BEFORE_DISCOUNT"
                ? D(invoiceItem.price).mul(D(invoiceItem.qty))
                : D(invoiceItem.subtotal);
          } else {
            baseAmount = D(treatmentItem.priceSnapshot);
          }

          const commissionAmount =
            rule.commissionType === "PERCENTAGE"
              ? baseAmount.mul(workRatio).mul(D(rule.commissionValue).div(100))
              : D(rule.commissionValue).mul(workRatio);

          rows.push({
            invoiceId,
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
          });
        }
      }
    }

    if (rows.length === 0) return { created: 0 };

    await bulkCreate(rows, tx);
    return { created: rows.length };
  });

module.exports = {
  listCommissions,
  getCommissionById,
  approveCommission,
  markCommissionPaid,
  generateCommission,
};
