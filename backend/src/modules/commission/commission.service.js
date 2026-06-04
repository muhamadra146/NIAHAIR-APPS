const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const {
  withTransaction,
  findInvoiceForGeneration,
  findActiveRuleForGeneration,
  countByInvoice,
  bulkCreate,
} = require("./commission.repository");

// ── Money helper ──────────────────────────────────────────────────────

const D = (v) => new Prisma.Decimal(String(v));

// ── Generator ─────────────────────────────────────────────────────────

const generateCommission = (invoiceId) =>
  withTransaction(async (tx) => {
    // 1 — Invoice must exist
    const invoice = await findInvoiceForGeneration(invoiceId, tx);
    if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

    // 2 — Duplicate guard inside the transaction
    // Concurrent requests both pass here only if they entered the transaction
    // simultaneously, which the DB serialises. The second will see count > 0.
    const existing = await countByInvoice(invoiceId, tx);
    if (existing > 0) {
      throw new AppError(
        "Commissions already generated for this invoice",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    // 3 — Walk the hierarchy: sessions → treatment items → assignments
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

    // 4 — Persist inside the same transaction that ran the duplicate check
    await bulkCreate(rows, tx);

    return { created: rows.length };
  });

module.exports = { generateCommission };
