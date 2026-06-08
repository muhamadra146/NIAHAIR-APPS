const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { handleInvoicePaid }        = require("./invoice.workflow");
const { createSyncJob }            = require("../syncQueue/syncQueue.service");
const { generateStockMovement }    = require("../inventory/inventory.service");
const {
  findAll,
  count,
  findById,
  countToday,
  findCustomerById,
  findBranchById,
  findItemById,
  findItemUnit,
  findActivePrice,
  findActivePriceGlobal,
  findTreatmentSessionsByIds,
  findDepositsByIds,
  createWithTransaction,
  cancelWithTransaction,
} = require("./invoice.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── List ──────────────────────────────────────────────────────────────

const listInvoices = async ({ page, limit, customerId, branchId, status, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (customerId) where.customerId = customerId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;

  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate.gte = new Date(startDate);
    if (endDate)   where.invoiceDate.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────

const getInvoiceById = async (id) => {
  const invoice = await findById(id);
  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);
  return invoice;
};

// ── Invoice number generator: INV-YYYYMMDD-XXXX ───────────────────────

const buildInvoiceNo = async () => {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");

  const startOfDay  = new Date(yyyy, now.getMonth(), now.getDate());
  const todayCount  = await countToday(startOfDay);

  return `INV-${yyyy}${mm}${dd}-${String(todayCount + 1).padStart(4, "0")}`;
};

// ── Create ────────────────────────────────────────────────────────────

const createInvoice = async (body, userId, branchId, createdByEmployeeId = null) => {
  const { customerId, appointmentId, treatmentSessionIds, depositIds, items, notes,
          taxable = false, inclusiveTax = false } = body;

  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  if (treatmentSessionIds && treatmentSessionIds.length > 0) {
    const sessions = await findTreatmentSessionsByIds(treatmentSessionIds);
    if (sessions.length !== treatmentSessionIds.length) {
      throw new AppError("One or more treatment sessions not found", StatusCodes.NOT_FOUND);
    }
    const alreadyAttached = sessions.filter((s) => s.invoiceId !== null);
    if (alreadyAttached.length > 0) {
      throw new AppError(
        "One or more treatment sessions are already attached to an invoice",
        StatusCodes.CONFLICT
      );
    }
  }

  // Resolve price and build line items
  const itemsData   = [];
  let totalSubtotal = D("0");
  let totalDiscount = D("0");
  let totalTax      = D("0");

  for (const line of items) {
    const item = await findItemById(line.itemId);
    if (!item) throw new AppError(`Item not found: ${line.itemId}`, StatusCodes.NOT_FOUND);

    const itemUnit = await findItemUnit({ itemId: line.itemId, unitId: line.unitId });
    if (!itemUnit) {
      throw new AppError(
        `Unit is not valid for item ${item.itemCode}`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    // Branch-specific price first, fall back to global price
    let priceRecord = await findActivePrice({ itemId: line.itemId, unitId: line.unitId, branchId });
    if (!priceRecord) {
      priceRecord = await findActivePriceGlobal({ itemId: line.itemId, unitId: line.unitId });
    }
    if (!priceRecord) {
      throw new AppError(
        `No active price found for item ${item.itemCode}`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const price     = D(priceRecord.sellingPrice);
    const qty       = D(line.qty);
    const discount  = D(line.discountAmount ?? 0);
    const grossLine = price.mul(qty).sub(discount);

    const lineTaxable = taxable && (line.taxable ?? false);

    let lineSubtotal, itemTax;
    if (!lineTaxable) {
      lineSubtotal = grossLine;
      itemTax      = D("0");
    } else if (inclusiveTax) {
      // Price already contains tax; extract DPP
      lineSubtotal = grossLine.div(D("1.11")).toDecimalPlaces(2);
      itemTax      = grossLine.sub(lineSubtotal);
    } else {
      // Tax added on top of DPP
      lineSubtotal = grossLine;
      itemTax      = grossLine.mul(D("0.11")).toDecimalPlaces(2);
    }

    totalSubtotal = totalSubtotal.add(lineSubtotal);
    totalDiscount = totalDiscount.add(discount);
    totalTax      = totalTax.add(itemTax);

    itemsData.push({
      itemId:   line.itemId,
      unitId:   line.unitId,
      qty,
      price,
      discount,
      subtotal: lineSubtotal,
      taxable:  lineTaxable,
      taxName:  lineTaxable ? "PPN" : null,
      taxRate:  lineTaxable ? D("11") : D("0"),
    });
  }

  const grandTotal = totalSubtotal.add(totalTax);

  // ── Validate and apply deposits ───────────────────────────────────────
  let totalDeposit = D("0");
  const depositsData = [];

  if (depositIds && depositIds.length > 0) {
    const deposits = await findDepositsByIds(depositIds);

    // Preserve the order the caller specified
    for (const depositId of depositIds) {
      const deposit = deposits.find((d) => d.id === depositId);
      if (!deposit) {
        throw new AppError(`Deposit not found: ${depositId}`, StatusCodes.NOT_FOUND);
      }

      const usable = ["PAID", "PARTIAL_USED"];
      if (!usable.includes(deposit.status)) {
        throw new AppError(
          `Deposit ${depositId} cannot be applied (status: ${deposit.status}). Only PAID and PARTIAL_USED deposits are usable.`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      if (deposit.appointment.customerId !== customerId) {
        throw new AppError(
          `Deposit ${depositId} belongs to a different customer`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      // Calculate remaining balance on this deposit
      const alreadyUsed = deposit.invoiceDeposits.reduce(
        (sum, id) => sum.add(D(id.amountApplied)),
        D("0")
      );
      const depositRemaining = D(deposit.amount).sub(alreadyUsed);

      if (depositRemaining.lte(D("0"))) {
        throw new AppError(
          `Deposit ${depositId} has no remaining balance`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      // Only apply what is still needed to cover the grand total
      const stillNeeded    = grandTotal.sub(totalDeposit);
      const amountApplied  = Prisma.Decimal.min(depositRemaining, stillNeeded);

      totalDeposit = totalDeposit.add(amountApplied);

      const newDepositStatus = depositRemaining.sub(amountApplied).gt(D("0"))
        ? "PARTIAL_USED"
        : "USED";

      depositsData.push({ depositId, amountApplied, newDepositStatus });
    }
  }

  // ── Determine invoice status ──────────────────────────────────────────
  const outstandingAmount = grandTotal.sub(totalDeposit);

  let invoiceStatus;
  if (totalDeposit.gte(grandTotal)) {
    invoiceStatus = "PAID";
  } else if (totalDeposit.gt(D("0"))) {
    invoiceStatus = "PARTIAL";
  } else {
    invoiceStatus = "UNPAID";
  }

  const invoiceNo = await buildInvoiceNo();

  const invoiceData = {
    customerId,
    branchId,
    appointmentId:       appointmentId ?? null,
    invoiceNo,
    invoiceDate:         new Date(),
    subtotal:            totalSubtotal,
    totalDiscount,
    totalTax,
    totalDeposit,
    grandTotal,
    paidAmount:          D("0"),
    outstandingAmount,
    status:              invoiceStatus,
    notes:               notes ?? null,
    createdByEmployeeId: createdByEmployeeId ?? null,
    taxable,
    inclusiveTax,
  };

  const invoice = await createWithTransaction({
    invoiceData,
    itemsData,
    sessionIds:   treatmentSessionIds ?? [],
    depositsData,
    userId,
  });

  // Stock OUT on invoice creation — physical goods are consumed at this point
  await generateStockMovement(invoice.id);

  // Deposit fully covered the invoice — trigger same workflow as payment path
  if (invoice.status === "PAID") {
    await handleInvoicePaid(invoice.id, userId);
  }

  // Queue Accurate push — worker picks it up asynchronously
  await createSyncJob({
    entityType: "INVOICE",
    entityId:   invoice.id,
    direction:  "APP_TO_ACCURATE",
  });

  return invoice;
};

// ── Cancel ────────────────────────────────────────────────────────────

const cancelInvoice = async (id, userId) => {
  const invoice = await findById(id);
  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

  if (invoice.status === "PAID") {
    throw new AppError("Cannot cancel a paid invoice", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (invoice.status === "CANCELLED") {
    throw new AppError("Invoice is already cancelled", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  return cancelWithTransaction({ invoice, userId });
};

module.exports = { listInvoices, getInvoiceById, createInvoice, cancelInvoice };
