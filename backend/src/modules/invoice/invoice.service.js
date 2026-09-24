const logger = require('../../utils/logger');
const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy }           = require("../../utils/sort");
const { handleInvoicePaid }        = require("./invoice.workflow");

const ORDER_MAP = {
  invoiceDate:    { invoiceDate: "asc" },
  "-invoiceDate": { invoiceDate: "desc" },
  createdAt:      { createdAt: "asc" },
  "-createdAt":   { createdAt: "desc" },
  grandTotal:     { grandTotal: "asc" },
  "-grandTotal":  { grandTotal: "desc" },
};
const { createSyncJob }            = require("../syncQueue/syncQueue.service");
const { generateSaleMovement, reverseInvoiceSaleMovements, reverseInvoiceServiceMovements } = require("../inventory/inventory.service");
const { accurateRequest }          = require("../accurate/accurate.client");
const prisma                       = require("../../config/prisma");
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
  findDepositForApply,
  findInvoiceForDepositApply,
  createWithTransaction,
  applyDepositWithTransaction,
  updateWithTransaction,
  cancelWithTransaction,
  deleteWithTransaction,
  findMaxInvoiceSeqToday,
  findDailyAssignment,
  findCommissionGenerateList,
  findAllPaidForJobAssignment,
  findByIdForWorksheet,
} = require("./invoice.repository");
const { getActiveMembership } = require("../membership/membership.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── List ──────────────────────────────────────────────────────────────

const listInvoices = async ({ page, limit, customerId, branchId, status, appointmentId, startDate, endDate, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP, "-invoiceDate");

  const where = {};
  if (customerId)   where.customerId   = customerId;
  if (branchId)     where.branchId     = branchId;
  if (status)       where.status       = status;
  if (appointmentId) where.appointmentId = appointmentId;

  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.invoiceDate.lte = end;
    }
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
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
  const now  = new Date(Date.now() + 7 * 3600 * 1000); // WIB (UTC+7)
  const yyyy = now.getUTCFullYear();
  const mm   = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd   = String(now.getUTCDate()).padStart(2, "0");
  const prefix = `INV-${yyyy}${mm}${dd}-`;

  const maxSeq = await findMaxInvoiceSeqToday(prefix);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

// ── Create ────────────────────────────────────────────────────────────

const createInvoice = async (body, userId, branchId, createdByEmployeeId = null) => {
  // Key-existence check distinguishes "absent = auto-apply" from "present as 0 = staff override"
  const membershipDiscountOverride = 'membershipDiscountTotal' in body;
  const { customerId, appointmentId, treatmentSessionIds, deposits = [], items, notes,
          taxable = false, inclusiveTax = false } = body;
  const bodyMembershipDiscount = membershipDiscountOverride ? D(body.membershipDiscountTotal ?? 0) : null;

  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  // Always fetch active membership — needed to determine discountType for grandTotal adjustment
  // even when override is present. The loop guard (!membershipDiscountOverride) prevents
  // auto-apply when the frontend has already handled the discount.
  let activeMembership = null;
  try {
    activeMembership = await getActiveMembership(customerId);
  } catch (err) {
    logger.warn(`[invoice create] membership fetch failed for customer ${customerId}: ${err.message}`);
  }

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
  const itemsData    = [];
  let membershipDiscountRunning = D("0");
  let totalSubtotal = D("0");
  let totalDiscount = D("0");
  let totalTax      = D("0");
  // totalSubtotal / totalTax hanya dari item layanan (isMaterial=false)
  // item bahan baku (isMaterial=true) tidak masuk grand total — hanya COGS internal

  for (const line of items) {
    const isMaterial = line.isMaterial === true;

    const item = await findItemById(line.itemId);
    if (!item) throw new AppError(`Item not found: ${line.itemId}`, StatusCodes.NOT_FOUND);

    const itemUnit = await findItemUnit({ itemId: line.itemId, unitId: line.unitId });
    if (!itemUnit) {
      throw new AppError(
        `Unit is not valid for item ${item.itemCode}`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    // Use override price if provided by client, otherwise resolve from ItemPrice
    let price;
    if (line.price !== undefined && line.price !== null) {
      price = D(line.price);
    } else {
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
      price = D(priceRecord.sellingPrice);
    }
    const qty             = D(line.qty);
    const discountType    = line.discountType ?? "AMOUNT";
    const discountPercent = discountType === "PERCENT" ? D(line.discountPercent ?? 0) : null;
    let discount          = discountType === "PERCENT"
      ? price.mul(qty).mul(discountPercent).div(D("100")).toDecimalPlaces(2)
      : D(line.discountAmount ?? 0);

    // Apply PERCENTAGE membership discount hanya pada layanan (bukan bahan baku)
    if (
      !isMaterial &&
      !membershipDiscountOverride &&
      activeMembership?.membership?.discountType === "PERCENTAGE" &&
      item.itemType === "SERVICE"
    ) {
      const membershipItemDiscount = price.mul(qty)
        .mul(D(activeMembership.membership.discountValue))
        .div(D("100"))
        .toDecimalPlaces(0);
      discount = discount.add(membershipItemDiscount);
      membershipDiscountRunning = membershipDiscountRunning.add(membershipItemDiscount);
    }

    const grossLine       = price.mul(qty).sub(discount);

    // Bahan baku tidak kena PPN (pajak hanya untuk layanan yg masuk tagihan)
    const lineTaxable = !isMaterial && taxable && (line.taxable ?? false);

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

    // Bahan baku TIDAK masuk total yang ditagih ke client
    if (!isMaterial) {
      totalSubtotal = totalSubtotal.add(lineSubtotal);
      totalDiscount = totalDiscount.add(discount);
      totalTax      = totalTax.add(itemTax);
    }

    itemsData.push({
      itemId:         line.itemId,
      unitId:         line.unitId,
      qty,
      price,
      discount,
      discountType,
      discountPercent: discountType === "PERCENT" ? discountPercent : null,
      subtotal:        lineSubtotal,
      taxable:         lineTaxable,
      taxName:         lineTaxable ? "PPN" : null,
      taxRate:         lineTaxable ? D("11") : D("0"),
      isMaterial,
      lineGroup:       line.lineGroup ?? null,
    });
  }

  // Compute membership discount total and final grandTotal
  let membershipDiscountTotal = D("0");
  const membershipId = activeMembership?.membership?.id ?? null;

  if (membershipDiscountOverride) {
    membershipDiscountTotal = bodyMembershipDiscount;
  } else if (activeMembership) {
    if (activeMembership.membership.discountType === "PERCENTAGE") {
      membershipDiscountTotal = membershipDiscountRunning;
      // grandTotal unaffected here — PERCENTAGE was folded into per-item discount above
    } else if (activeMembership.membership.discountType === "FIXED_AMOUNT") {
      const preDiscountTotal = totalSubtotal.add(totalTax);
      const discountValue    = D(activeMembership.membership.discountValue);
      membershipDiscountTotal = discountValue.gt(preDiscountTotal) ? preDiscountTotal : discountValue;
    }
  }

  // For FIXED_AMOUNT: deduct membership discount from grandTotal at invoice level.
  // This applies for both auto-apply and override cases — the frontend does NOT bake
  // FIXED_AMOUNT into per-item subtotals, so we must deduct here.
  // For PERCENTAGE: grandTotal is already correct (discount baked into per-item subtotals).
  const preDiscountGrandTotal = totalSubtotal.add(totalTax);
  const isFixedAmount         = activeMembership?.membership?.discountType === "FIXED_AMOUNT";
  const fixedAmountApplied    = isFixedAmount && membershipDiscountTotal.gt(D("0"));
  const grandTotal = fixedAmountApplied
    ? (preDiscountGrandTotal.sub(membershipDiscountTotal).gt(D("0"))
        ? preDiscountGrandTotal.sub(membershipDiscountTotal)
        : D("0"))
    : preDiscountGrandTotal;

  // ── Validate and apply deposits ───────────────────────────────────────
  let totalDeposit = D("0");
  const depositsData = [];

  if (deposits.length > 0) {
    const depositRecords = await findDepositsByIds(deposits.map((d) => d.depositId));

    for (const { depositId, amount } of deposits) {
      const deposit = depositRecords.find((d) => d.id === depositId);
      if (!deposit) {
        throw new AppError(`Deposit not found: ${depositId}`, StatusCodes.NOT_FOUND);
      }

      const usable = ["PAID", "PARTIAL_USED"];
      if (!usable.includes(deposit.status)) {
        throw new AppError(
          `Deposit ${depositId} cannot be applied (status: ${deposit.status}). Must be PAID or PARTIAL_USED.`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      if (deposit.customerId !== customerId) {
        throw new AppError(
          `Deposit ${depositId} belongs to a different customer`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

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

      const amountToApply = D(amount);
      const stillNeeded   = grandTotal.sub(totalDeposit);

      if (amountToApply.gt(depositRemaining)) {
        throw new AppError(
          `Deposit ${depositId}: amount (${amountToApply}) exceeds remaining balance (${depositRemaining})`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }
      if (amountToApply.gt(stillNeeded)) {
        throw new AppError(
          `Deposit ${depositId}: amount (${amountToApply}) exceeds invoice outstanding (${stillNeeded})`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      totalDeposit = totalDeposit.add(amountToApply);

      const newDepositStatus = depositRemaining.sub(amountToApply).gt(D("0"))
        ? "PARTIAL_USED"
        : "USED";

      depositsData.push({ depositId, amountApplied: amountToApply, newDepositStatus });
    }
  }

  // ── Determine invoice status ──────────────────────────────────────────
  const outstandingAmount = grandTotal.sub(totalDeposit);

  let invoiceStatus;
  if (totalDeposit.gte(grandTotal)) {
    invoiceStatus = "PAID";
  } else {
    invoiceStatus = "UNPAID";
  }

  const invoiceNo = await buildInvoiceNo();

  const invoiceData = {
    customerId,
    branchId,
    appointmentId:          appointmentId ?? null,
    invoiceNo,
    invoiceDate:            new Date(),
    subtotal:               totalSubtotal,
    totalDiscount,
    totalTax,
    totalDeposit,
    grandTotal,
    membershipDiscountTotal,
    membershipId,
    paidAmount:             D("0"),
    outstandingAmount,
    status:                 invoiceStatus,
    notes:                  notes ?? null,
    createdByEmployeeId:    createdByEmployeeId ?? null,
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
  await generateSaleMovement(invoice.id);

  // Auto-create treatment session so staff can assign immediately in Assignment Harian
  try {
    await setupTreatmentSession(invoice.id);
  } catch (err) {
    logger.warn(`[invoice create] treatment session setup failed for ${invoice.id}: ${err.message}`);
  }

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

// ── Reset treatment session items after invoice edit ─────────────────
//
// Deletes all treatment items (and their assignments) for the session,
// then recreates them from the updated invoice items.
// Only called when no commissions exist — safe to wipe and rebuild.

const resetTreatmentSessionItems = async (invoiceId) => {
  const session = await prisma.treatmentSession.findFirst({
    where:  { invoiceId },
    select: { id: true },
  });
  if (!session) return;

  // Delete all treatment items — cascades to assignments & material usages
  await prisma.treatmentItem.deleteMany({ where: { treatmentSessionId: session.id } });

  // Recreate from updated invoice items
  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: { items: { select: { itemId: true, unitId: true, qty: true, price: true, isMaterial: true } } },
  });
  if (!invoice) return;

  // Hanya buat TreatmentItem dari layanan (isMaterial=false)
  for (const line of invoice.items.filter((i) => !i.isMaterial)) {
    const itemUnit = await prisma.itemUnit.findFirst({
      where:  { itemId: line.itemId, unitId: line.unitId },
      select: { conversionFactor: true },
    });
    await prisma.treatmentItem.create({
      data: {
        treatmentSessionId: session.id,
        itemId:             line.itemId,
        unitId:             line.unitId,
        qty:                line.qty,
        priceSnapshot:      line.price,
        conversionSnapshot: itemUnit ? Number(itemUnit.conversionFactor) : 1,
      },
    });
  }
};

// ── Update ────────────────────────────────────────────────────────────

const updateInvoice = async (id, body, userId) => {
  const existing = await findById(id);
  if (!existing) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);
  if (existing.status === "CANCELLED") {
    throw new AppError("Cannot edit a cancelled invoice", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (existing.status === "PAID") {
    throw new AppError("Cannot edit a paid invoice", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Block edit if commissions already generated
  const commissionCount = await prisma.commission.count({ where: { invoiceId: id } });
  if (commissionCount > 0) {
    throw new AppError(
      "Tidak dapat mengubah invoice yang sudah memiliki komisi. Hapus komisi terlebih dahulu.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const membershipDiscountOverride = 'membershipDiscountTotal' in body;
  const { items, notes, taxable = false, inclusiveTax = false } = body;
  const bodyMembershipDiscount = membershipDiscountOverride ? D(body.membershipDiscountTotal ?? 0) : null;
  const branchId = existing.branchId;

  let activeMembership = null;
  try {
    activeMembership = await getActiveMembership(existing.customerId);
  } catch (err) {
    logger.warn(`[invoice update] membership fetch failed for customer ${existing.customerId}: ${err.message}`);
  }

  // Re-resolve prices and build new line items (same logic as createInvoice)
  const itemsData    = [];
  let totalSubtotal = D("0");
  let totalDiscount = D("0");
  let totalTax      = D("0");
  let membershipDiscountRunning = D("0");
  // totalSubtotal / totalTax hanya dari item layanan (isMaterial=false)

  for (const line of items) {
    const isMaterial = line.isMaterial === true;

    const item = await findItemById(line.itemId);
    if (!item) throw new AppError(`Item not found: ${line.itemId}`, StatusCodes.NOT_FOUND);

    const itemUnit = await findItemUnit({ itemId: line.itemId, unitId: line.unitId });
    if (!itemUnit) {
      throw new AppError(`Unit is not valid for item ${item.itemCode}`, StatusCodes.UNPROCESSABLE_ENTITY);
    }

    let price;
    if (line.price !== undefined && line.price !== null) {
      price = D(line.price);
    } else {
      let priceRecord = await findActivePrice({ itemId: line.itemId, unitId: line.unitId, branchId });
      if (!priceRecord) priceRecord = await findActivePriceGlobal({ itemId: line.itemId, unitId: line.unitId });
      if (!priceRecord) {
        throw new AppError(`No active price found for item ${item.itemCode}`, StatusCodes.UNPROCESSABLE_ENTITY);
      }
      price = D(priceRecord.sellingPrice);
    }

    const qty             = D(line.qty);
    const discountType    = line.discountType ?? "AMOUNT";
    const discountPercent = discountType === "PERCENT" ? D(line.discountPercent ?? 0) : null;
    let discount          = discountType === "PERCENT"
      ? price.mul(qty).mul(discountPercent).div(D("100")).toDecimalPlaces(2)
      : D(line.discountAmount ?? 0);

    // Membership discount hanya untuk layanan (bukan bahan baku)
    if (
      !isMaterial &&
      !membershipDiscountOverride &&
      activeMembership?.membership?.discountType === "PERCENTAGE" &&
      item.itemType === "SERVICE"
    ) {
      const membershipItemDiscount = price.mul(qty)
        .mul(D(activeMembership.membership.discountValue))
        .div(D("100"))
        .toDecimalPlaces(0);
      discount = discount.add(membershipItemDiscount);
      membershipDiscountRunning = membershipDiscountRunning.add(membershipItemDiscount);
    }

    const grossLine       = price.mul(qty).sub(discount);
    // Bahan baku tidak kena PPN
    const lineTaxable     = !isMaterial && taxable && (line.taxable ?? false);

    let lineSubtotal, itemTax;
    if (!lineTaxable) {
      lineSubtotal = grossLine;
      itemTax      = D("0");
    } else if (inclusiveTax) {
      lineSubtotal = grossLine.div(D("1.11")).toDecimalPlaces(2);
      itemTax      = grossLine.sub(lineSubtotal);
    } else {
      lineSubtotal = grossLine;
      itemTax      = grossLine.mul(D("0.11")).toDecimalPlaces(2);
    }

    // Bahan baku tidak masuk total tagihan client
    if (!isMaterial) {
      totalSubtotal = totalSubtotal.add(lineSubtotal);
      totalDiscount = totalDiscount.add(discount);
      totalTax      = totalTax.add(itemTax);
    }

    itemsData.push({
      itemId:          line.itemId,
      unitId:          line.unitId,
      qty,
      price,
      discount,
      discountType,
      discountPercent: discountType === "PERCENT" ? discountPercent : null,
      subtotal:        lineSubtotal,
      taxable:         lineTaxable,
      taxName:         lineTaxable ? "PPN" : null,
      taxRate:         lineTaxable ? D("11") : D("0"),
      isMaterial,
      lineGroup:       line.lineGroup ?? null,
    });
  }

  let membershipDiscountTotal = D("0");
  const membershipId = activeMembership?.membership?.id ?? null;

  if (membershipDiscountOverride) {
    membershipDiscountTotal = bodyMembershipDiscount;
  } else if (activeMembership) {
    if (activeMembership.membership.discountType === "PERCENTAGE") {
      membershipDiscountTotal = membershipDiscountRunning;
    } else if (activeMembership.membership.discountType === "FIXED_AMOUNT") {
      const preDiscountTotal = totalSubtotal.add(totalTax);
      const discountValue    = D(activeMembership.membership.discountValue);
      membershipDiscountTotal = discountValue.gt(preDiscountTotal) ? preDiscountTotal : discountValue;
    }
  }

  const preDiscountGrandTotal = totalSubtotal.add(totalTax);
  const isFixedAmount         = activeMembership?.membership?.discountType === "FIXED_AMOUNT";
  const fixedAmountApplied    = isFixedAmount && membershipDiscountTotal.gt(D("0"));
  const grandTotal = fixedAmountApplied
    ? (preDiscountGrandTotal.sub(membershipDiscountTotal).gt(D("0"))
        ? preDiscountGrandTotal.sub(membershipDiscountTotal)
        : D("0"))
    : preDiscountGrandTotal;

  // Keep existing deposits and payments; recalculate outstanding
  const existingTotalDeposit = D(existing.totalDeposit);
  const existingPaidAmount   = D(existing.paidAmount);
  const newOutstanding       = grandTotal.sub(existingTotalDeposit).sub(existingPaidAmount);
  const safeOutstanding      = newOutstanding.lte(D("0")) ? D("0") : newOutstanding;

  const newStatus = safeOutstanding.lte(D("0")) ? "PAID" : "UNPAID";

  const invoiceData = {
    subtotal:               totalSubtotal,
    totalDiscount,
    totalTax,
    grandTotal,
    membershipDiscountTotal,
    membershipId,
    outstandingAmount:      safeOutstanding,
    status:                 newStatus,
    notes:                  notes ?? null,
    taxable,
    inclusiveTax,
  };

  // Reverse old SALE movements before items are replaced
  await reverseInvoiceSaleMovements(existing.invoiceNo);

  const updated = await updateWithTransaction({
    invoiceId: id,
    invoiceData,
    itemsData,
    oldStatus: existing.status,
    userId,
  });

  // Generate new SALE movements for the updated items
  await generateSaleMovement(id);

  // Reset treatment session items to match updated invoice items
  try {
    await resetTreatmentSessionItems(id);
  } catch (err) {
    logger.warn(`[invoice update] treatment session reset failed for ${id}: ${err.message}`);
  }

  // Re-sync to Accurate
  await createSyncJob({ entityType: "INVOICE", entityId: id, direction: "APP_TO_ACCURATE" });

  if (newStatus === "PAID" && existing.status !== "PAID") {
    await handleInvoicePaid(id, userId);
  }

  return updated;
};

// ── Apply deposit to existing invoice ────────────────────────────────

const applyDepositToInvoice = async (invoiceId, { depositId, amount }, userId) => {
  const invoice = await findInvoiceForDepositApply(invoiceId);
  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

  if (["PAID", "CANCELLED"].includes(invoice.status)) {
    throw new AppError(
      `Cannot apply deposit to invoice with status ${invoice.status}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const deposit = await findDepositForApply(depositId);
  if (!deposit) throw new AppError("Deposit not found", StatusCodes.NOT_FOUND);

  const usable = ["PAID", "PARTIAL_USED"];
  if (!usable.includes(deposit.status)) {
    throw new AppError(
      `Deposit cannot be applied (status: ${deposit.status}). Must be PAID or PARTIAL_USED.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  if (deposit.customerId !== invoice.customerId) {
    throw new AppError("Deposit belongs to a different customer", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const alreadyApplied = deposit.invoiceDeposits.some((d) => d.invoiceId === invoiceId);
  if (alreadyApplied) {
    throw new AppError("Deposit ini sudah diterapkan ke invoice ini", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const alreadyUsed = deposit.invoiceDeposits.reduce(
    (sum, id) => sum.add(D(id.amountApplied)),
    D("0")
  );
  const depositRemaining  = D(deposit.amount).sub(alreadyUsed);
  const outstandingAmount = D(invoice.outstandingAmount);
  const amountToApply     = D(amount);

  if (amountToApply.lte(D("0"))) {
    throw new AppError("Amount must be greater than 0", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (amountToApply.gt(depositRemaining)) {
    throw new AppError(
      `Amount (${amountToApply}) exceeds deposit remaining balance (${depositRemaining})`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }
  if (amountToApply.gt(outstandingAmount)) {
    throw new AppError(
      `Amount (${amountToApply}) exceeds invoice outstanding amount (${outstandingAmount})`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const newDepositStatus  = depositRemaining.sub(amountToApply).gt(D("0")) ? "PARTIAL_USED" : "USED";
  const newTotalDeposit   = D(invoice.totalDeposit).add(amountToApply);
  const newOutstanding    = outstandingAmount.sub(amountToApply);
  const newInvoiceStatus  = newOutstanding.lte(D("0")) ? "PAID" : "UNPAID";

  const updated = await applyDepositWithTransaction({
    invoiceId,
    depositId,
    amountApplied:    amountToApply,
    newDepositStatus,
    newTotalDeposit,
    newOutstanding,
    newInvoiceStatus,
    oldInvoiceStatus: invoice.status,
    userId,
  });

  if (newInvoiceStatus === "PAID") {
    await handleInvoicePaid(invoiceId, userId);
  }

  await createSyncJob({ entityType: "INVOICE", entityId: invoiceId, direction: "APP_TO_ACCURATE" });

  return updated;
};

// ── Setup Treatment Session ───────────────────────────────────────────
//
// Menghubungkan invoice ke TreatmentSession dan membuat TreatmentItem dari item layanan.
//
// FLOW BARU (setelah redesign):
//   - TreatmentSession dibuat saat booking → IN_PROGRESS (bukan dari invoice).
//   - Fungsi ini dipanggil saat invoice dibuat/diupdate:
//     1. Jika session sudah ada (dari IN_PROGRESS) → link invoiceId + buat TreatmentItems.
//     2. Jika belum ada (walk-in / edge case) → buat session + items sekaligus.
//   - Idempotent: jika session sudah punya items, tidak lakukan apa-apa.

const setupTreatmentSession = async (invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id:            true,
      customerId:    true,
      branchId:      true,
      appointmentId: true,
      status:        true,
      items: {
        select: {
          id:         true,
          itemId:     true,
          unitId:     true,
          qty:        true,
          price:      true,
          isMaterial: true,
          item:   { select: { id: true, name: true, itemCode: true, itemType: true } },
          unit:   { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

  // ── Cari session yang sudah ada ──────────────────────────────────────
  // Prioritas: cari via appointmentId (dibuat saat IN_PROGRESS), lalu via invoiceId
  let existingSession = null;

  if (invoice.appointmentId) {
    existingSession = await prisma.treatmentSession.findFirst({
      where: { appointmentId: invoice.appointmentId },
      include: { treatmentItems: { select: { id: true } } },
    });
  }

  if (!existingSession) {
    existingSession = await prisma.treatmentSession.findFirst({
      where: { invoiceId },
      include: { treatmentItems: { select: { id: true } } },
    });
  }

  // Idempotent: session sudah ada dan sudah punya items → return
  if (existingSession && existingSession.treatmentItems.length > 0) {
    // Pastikan invoiceId sudah terhubung (jika session dibuat sebelum invoice)
    if (!existingSession.invoiceId) {
      await prisma.treatmentSession.update({
        where: { id: existingSession.id },
        data:  { invoiceId },
      });
    }
    return existingSession;
  }

  // ── Buat atau update session + items dalam transaction ───────────────
  return prisma.$transaction(async (tx) => {
    let sessionId;

    if (existingSession) {
      // Session sudah ada (dari IN_PROGRESS) tapi belum punya items → link invoiceId
      await tx.treatmentSession.update({
        where: { id: existingSession.id },
        data:  { invoiceId },
      });
      sessionId = existingSession.id;
    } else {
      // Belum ada session → buat baru (walk-in atau edge case)
      const session = await tx.treatmentSession.create({
        data: {
          customerId:    invoice.customerId,
          branchId:      invoice.branchId,
          invoiceId,
          appointmentId: invoice.appointmentId ?? null,
          startedAt:     new Date(),
        },
      });
      sessionId = session.id;
    }

    // Hanya buat TreatmentItem dari layanan (isMaterial=false)
    // Bahan baku (isMaterial=true) tidak masuk treatment session
    const serviceItems = invoice.items.filter((i) => !i.isMaterial);

    for (const line of serviceItems) {
      // conversionSnapshot: fetch from item_units for the unit used on this invoice line
      const itemUnit = await tx.itemUnit.findFirst({
        where:  { itemId: line.itemId, unitId: line.unitId },
        select: { conversionFactor: true },
      });
      const conversionSnapshot = itemUnit ? Number(itemUnit.conversionFactor) : 1;

      await tx.treatmentItem.create({
        data: {
          treatmentSessionId: sessionId,
          itemId:             line.itemId,
          unitId:             line.unitId,
          qty:                line.qty,
          priceSnapshot:      line.price,
          conversionSnapshot,
        },
      });
    }

    return tx.treatmentSession.findUnique({
      where: { id: sessionId },
      include: {
        treatmentItems: {
          include: {
            item:        { select: { id: true, name: true, itemCode: true } },
            unit:        { select: { id: true, name: true } },
            assignments: {
              include: {
                employee: { select: { id: true, name: true, employeeCode: true } },
              },
            },
          },
        },
      },
    });
  });
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

  await reverseInvoiceSaleMovements(invoice.invoiceNo);
  return cancelWithTransaction({ invoice, userId });
};

const deleteInvoice = async (id) => {
  const invoice = await findById(id);
  if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

  if (invoice.status === "PAID") {
    throw new AppError("Invoice yang sudah lunas tidak dapat dihapus", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const paymentCount = await prisma.payment.count({ where: { invoiceId: id } });
  if (paymentCount > 0) {
    throw new AppError(
      "Hapus semua pembayaran invoice terlebih dahulu sebelum menghapus invoice ini",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  // Reverse SALE movements (invoice items) — restores inventory stock
  await reverseInvoiceSaleMovements(invoice.invoiceNo);

  // Reverse SERVICE_USAGE movements (treatment materials) — restores material stock
  await reverseInvoiceServiceMovements(id);

  // Delete from Accurate first if it was synced
  if (invoice.accurateInvoiceId) {
    try {
      const resp = await accurateRequest("/sales-invoice/delete.do", {
        method: "POST",
        body:   { id: invoice.accurateInvoiceId },
      });
      if (!resp.s) {
        logger.warn(`[invoice delete] Accurate delete failed for accurateId=${invoice.accurateInvoiceId}:`, resp.d ?? resp);
      } else {
        logger.info(`[invoice delete] Accurate delete ok accurateId=${invoice.accurateInvoiceId}`);
      }
    } catch (err) {
      logger.warn(`[invoice delete] Accurate delete error (continuing with local delete): ${err.message}`);
    }
  }

  await deleteWithTransaction(id);
};

// ── Daily Assignment ─────────────────────────────────────────────────

const getDailyAssignment = async ({ date, branchId }) => {
  if (!date) throw new AppError("Query param 'date' (YYYY-MM-DD) is required", StatusCodes.BAD_REQUEST);

  // Build WIB (UTC+7) day boundaries
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const localDay = new Date(`${date}T00:00:00.000Z`);
  const start = new Date(localDay.getTime() - WIB_OFFSET_MS); // 00:00 WIB = 17:00 UTC prev day
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999 WIB

  const invoices = await findDailyAssignment({ start, end, branchId });

  const LIMIT = 100;
  const truncated = invoices.length >= LIMIT;

  return { data: invoices, truncated, date };
};

// ── Generate Commission List ──────────────────────────────────────────
// Returns PAID invoices with commission status for the Generate Komisi page.

const getCommissionGenerateList = async ({ page, limit, branchId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = { status: "PAID" };
  if (branchId) where.branchId = branchId;

  if (startDate || endDate) {
    const WIB = 7 * 60 * 60 * 1000;
    where.invoiceDate = {};
    if (startDate) {
      const d = new Date(`${startDate}T00:00:00.000Z`);
      where.invoiceDate.gte = new Date(d.getTime() - WIB);
    }
    if (endDate) {
      const d = new Date(`${endDate}T00:00:00.000Z`);
      where.invoiceDate.lte = new Date(d.getTime() - WIB + 24 * 60 * 60 * 1000 - 1);
    }
  }

  const [invoices, total] = await Promise.all([
    findCommissionGenerateList({ skip, take, where }),
    prisma.invoice.count({ where }),
  ]);

  return { data: invoices, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Skip Commission ───────────────────────────────────────────────────

const resetCommissionSkip = async (invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: { id: true, status: true, commissionSkipped: true },
  });

  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!invoice.commissionSkipped) throw new AppError("Invoice tidak dalam status skip komisi", StatusCodes.UNPROCESSABLE_ENTITY);

  return prisma.invoice.update({
    where: { id: invoiceId },
    data:  { commissionSkipped: false },
    select: { id: true, commissionSkipped: true },
  });
};

const skipCommission = async (invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: { id: true, status: true, commissionSkipped: true, _count: { select: { commissions: true } } },
  });

  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status !== "PAID") throw new AppError("Invoice harus berstatus PAID", StatusCodes.UNPROCESSABLE_ENTITY);
  if (invoice._count.commissions > 0) throw new AppError("Invoice sudah memiliki komisi, tidak bisa di-skip", StatusCodes.UNPROCESSABLE_ENTITY);

  return prisma.invoice.update({
    where: { id: invoiceId },
    data:  { commissionSkipped: true },
    select: { id: true, commissionSkipped: true },
  });
};

// ── Job Assignment Invoices ────────────────────────────────────────────

const getJobAssignmentInvoices = async ({ branchId, startDate, endDate }) => {
  // Konversi string tanggal (YYYY-MM-DD) ke range UTC yang benar untuk WIB (UTC+7)
  const WIB = 7 * 60 * 60 * 1000;
  let gteDate, lteDate;
  if (startDate) {
    const d = new Date(`${startDate}T00:00:00.000Z`);
    gteDate = new Date(d.getTime() - WIB);                              // WIB midnight → UTC 17:00 prev day
  }
  if (endDate) {
    const d = new Date(`${endDate}T00:00:00.000Z`);
    lteDate = new Date(d.getTime() - WIB + 24 * 60 * 60 * 1000 - 1);  // WIB end-of-day → UTC 16:59:59 same day
  }
  const invoices = await findAllPaidForJobAssignment({ branchId, gteDate, lteDate });
  return invoices;
};

// ── Submit Job Assignments + Auto-Generate Commission ─────────────────

const { upsertMany: upsertManyJobAssignments } = require("../treatment/treatmentJobAssignment.repository");

const submitJobAssignments = async (invoiceId, sessionsPayload) => {
  // Tx 1: validasi + hapus PENDING + simpan assignments
  let assignedCount = 0;
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where:  { id: invoiceId },
      select: { id: true, status: true },
    });
    if (!invoice)              throw new AppError("Invoice tidak ditemukan",   StatusCodes.NOT_FOUND);
    if (invoice.status !== "PAID") throw new AppError("Invoice harus berstatus PAID untuk generate komisi", StatusCodes.UNPROCESSABLE_ENTITY);

    const existingCommissions = await tx.commission.findMany({
      where:  { invoiceId },
      select: { id: true, status: true },
    });
    const hasLocked = existingCommissions.some((c) => c.status === "APPROVED" || c.status === "PAID");
    if (hasLocked) {
      throw new AppError("Komisi sudah disetujui atau dibayar, tidak bisa diubah", StatusCodes.UNPROCESSABLE_ENTITY);
    }
    if (existingCommissions.length > 0) {
      await tx.commission.deleteMany({ where: { invoiceId, status: "PENDING" } });
    }

    for (const { assignments } of sessionsPayload) {
      if (!assignments?.length) continue;
      await upsertManyJobAssignments(assignments, tx);
      assignedCount += assignments.length;
    }
  });

  // Tidak auto-generate — user akan buka CommissionCalculatorPage untuk hitung & finalize
  return { assigned: assignedCount, commissionsCreated: 0, needsCalculator: true };
};

// ── Commission Worksheet ───────────────────────────────────────────────

const { findActiveByEmployeeAndJob } = require("../commissionRule/commissionRule.repository");

const getCommissionWorksheet = async (invoiceId) => {
  const invoice = await findByIdForWorksheet(invoiceId);
  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status !== "PAID") throw new AppError("Invoice harus berstatus PAID", StatusCodes.UNPROCESSABLE_ENTITY);

  // Gunakan invoiceDate sebagai acuan aturan komisi (konsisten dengan commission engine)
  const asOfDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();

  const treatmentItems = [];

  // Build an itemId → InvoiceItem map to resolve baseAmount (same logic as commission engine)
  const invoiceItemMap = new Map();
  for (const ii of invoice.items ?? []) {
    if (!invoiceItemMap.has(ii.itemId)) invoiceItemMap.set(ii.itemId, ii);
  }

  for (const session of invoice.treatmentSessions ?? []) {
    for (const ti of session.treatmentItems ?? []) {
      const cat = ti.item?.commissionCategory;
      if (!cat) continue; // item tanpa kategori komisi = skip

      // Resolve baseAmount: prefer InvoiceItem.subtotal, fallback to priceSnapshot
      const invoiceItem = invoiceItemMap.get(ti.item?.id);
      const baseAmount  = invoiceItem
        ? Number(invoiceItem.subtotal)
        : Number(ti.priceSnapshot ?? 0);

      // Group job assignments by commissionJobId
      const jobMap = new Map();
      for (const ja of ti.jobAssignments ?? []) {
        if (!ja.commissionJobId || !ja.employeeId) continue;
        if (!jobMap.has(ja.commissionJobId)) jobMap.set(ja.commissionJobId, []);
        jobMap.get(ja.commissionJobId).push(ja);
      }
      if (jobMap.size === 0) continue;

      // Build job list ordered by sortOrder from category.jobs
      const jobs = [];
      for (const jobDef of cat.jobs ?? []) {
        const workers_raw = jobMap.get(jobDef.id);
        if (!workers_raw?.length) continue;

        // Fetch commission rule per worker
        const workers = await Promise.all(workers_raw.map(async (ja) => {
          const rule = await findActiveByEmployeeAndJob(ja.employeeId, cat.id, ja.commissionJobId, asOfDate);
          return {
            treatmentJobAssignmentId: ja.id,
            employeeId:    ja.employeeId,
            employeeName:  ja.employee?.name ?? "",
            workQty:       ja.workQty !== null && ja.workQty !== undefined ? Number(ja.workQty) : null,
            commissionRuleId:   rule?.id ?? null,
            commissionType:     rule?.commissionType ?? null,
            commissionValue:    rule?.commissionValue !== undefined ? String(rule.commissionValue) : null,
            commissionBase:     rule?.commissionBase ?? null,
            baseAmount:         baseAmount,   // passed to frontend for pre-fill calculation
          };
        }));

        jobs.push({
          commissionJobId:  jobDef.id,
          jobName:          jobDef.name,
          jobKey:           jobDef.jobKey,
          sortOrder:        jobDef.sortOrder,
          // Chain deduction fields — dipakai frontend untuk kalkulasi otomatis
          deductsFromJobId: jobDef.deductsFromJobId ?? null,
          pricePerUnit:     jobDef.pricePerUnit != null ? Number(jobDef.pricePerUnit) : null,
          unit:             jobDef.unit ?? "helai",
          workers,
        });
      }

      if (jobs.length === 0) continue;

      treatmentItems.push({
        treatmentItemId: ti.id,
        itemId:          ti.item?.id,
        itemName:        ti.item?.name ?? "",
        subtotal:        String(baseAmount),
        // qty dalam helai = qty item × conversionSnapshot (mis: 1 TEBAL × 180 = 180 helai)
        qty:             ti.qty !== null && ti.qty !== undefined
          ? Math.round(Number(ti.qty) * Number(ti.conversionSnapshot ?? 1))
          : null,
        categoryId:      cat.id,
        categoryName:    cat.name,
        jobs,
      });
    }
  }

  return {
    invoiceId:   invoice.id,
    invoiceNo:   invoice.invoiceNo,
    grandTotal:  String(invoice.grandTotal),
    customer:    invoice.customer,
    treatmentItems,
    commissions: invoice.commissions ?? [],
  };
};

// ── Finalize Commission From Calculator ───────────────────────────────
//
// Payload: { rows: [ { treatmentJobAssignmentId, commissionAmount, commissionRuleId?,
//   commissionType, commissionValue, commissionBase, baseAmount,
//   workQty?, workRatio?, notes? } ] }
//
// Backend validates TJAs belong to this invoice, deletes PENDING, creates new commissions.

const finalizeCommissionFromCalculator = async (invoiceId, rows) => {
  if (!rows?.length) throw new AppError("Tidak ada data komisi yang dikirim", StatusCodes.UNPROCESSABLE_ENTITY);

  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: { id: true, status: true },
  });
  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status !== "PAID") throw new AppError("Invoice harus berstatus PAID", StatusCodes.UNPROCESSABLE_ENTITY);

  // Validate no APPROVED/PAID commissions
  const locked = await prisma.commission.count({
    where: { invoiceId, status: { in: ["APPROVED", "PAID"] } },
  });
  if (locked > 0) throw new AppError("Komisi sudah disetujui atau dibayar, tidak bisa diubah", StatusCodes.UNPROCESSABLE_ENTITY);

  // Validasi duplikasi TJA dalam payload sebelum masuk DB
  const rawTjaIds = rows.map((r) => r.treatmentJobAssignmentId).filter(Boolean);
  const uniqueCheck = new Set(rawTjaIds);
  if (uniqueCheck.size !== rawTjaIds.length) {
    throw new AppError("Terdapat duplikasi treatmentJobAssignmentId dalam payload", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Fetch TJAs so we can fill employeeId + serviceItemId on Commission
  const tjaIds = [...uniqueCheck];
  const tjas   = await prisma.treatmentJobAssignment.findMany({
    where:   { id: { in: tjaIds } },
    include: {
      treatmentItem: {
        include: {
          treatmentSession: { select: { invoiceId: true } },
          item:             { select: { id: true } },
        },
      },
    },
  });

  const tjaMap = new Map(tjas.map((t) => [t.id, t]));

  // Validate all TJAs belong to this invoice
  for (const tja of tjas) {
    if (tja.treatmentItem?.treatmentSession?.invoiceId !== invoiceId) {
      throw new AppError(`TreatmentJobAssignment ${tja.id} tidak milik invoice ini`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
  }

  // Delete PENDING + create new
  await prisma.$transaction(async (tx) => {
    await tx.commission.deleteMany({ where: { invoiceId, status: "PENDING" } });

    const data = rows.map((row) => {
      const tja = tjaMap.get(row.treatmentJobAssignmentId);
      if (!tja) throw new AppError(`TJA ${row.treatmentJobAssignmentId} tidak ditemukan`, StatusCodes.UNPROCESSABLE_ENTITY);

      const serviceItemId = tja.treatmentItem?.item?.id;
      if (!serviceItemId) throw new AppError(`TJA ${tja.id} tidak memiliki item yang valid`, StatusCodes.UNPROCESSABLE_ENTITY);

      return {
        invoiceId,
        treatmentJobAssignmentId: row.treatmentJobAssignmentId,
        employeeId:               tja.employeeId,
        serviceItemId,
        commissionRuleId:         row.commissionRuleId ?? null,
        commissionType:           row.commissionType ?? "PERCENTAGE",
        commissionValue:          String(row.commissionValue ?? 0),
        commissionBase:           row.commissionBase ?? "AFTER_DISCOUNT",
        baseAmount:               String(row.baseAmount ?? 0),
        workQty:                  row.workQty !== undefined && row.workQty !== null ? String(row.workQty) : null,
        workRatio:                row.workRatio !== undefined && row.workRatio !== null ? String(row.workRatio) : null,
        commissionAmount:         String(row.commissionAmount ?? 0),
        notes:                    row.notes ?? null,
        status:                   "PENDING",
      };
    });

    await tx.commission.createMany({ data });
  });

  const created = await prisma.commission.count({ where: { invoiceId, status: "PENDING" } });
  return { created };
};

module.exports = {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  applyDepositToInvoice,
  cancelInvoice,
  deleteInvoice,
  setupTreatmentSession,
  getDailyAssignment,
  getCommissionGenerateList,
  skipCommission,
  resetCommissionSkip,
  getJobAssignmentInvoices,
  submitJobAssignments,
  getCommissionWorksheet,
  finalizeCommissionFromCalculator,
};
