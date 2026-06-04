const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
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

const createInvoice = async (body, userId) => {
  const { customerId, branchId, appointmentId, treatmentSessionIds, items, notes } = body;

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
  const itemsData    = [];
  let totalSubtotal  = D("0");
  let totalDiscount  = D("0");

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

    const price    = D(priceRecord.sellingPrice);
    const qty      = D(line.qty);
    const discount = D(line.discountAmount ?? 0);
    const subtotal = price.mul(qty).sub(discount);

    totalSubtotal = totalSubtotal.add(price.mul(qty));
    totalDiscount = totalDiscount.add(discount);

    itemsData.push({ itemId: line.itemId, unitId: line.unitId, qty, price, discount, subtotal });
  }

  const grandTotal = totalSubtotal.sub(totalDiscount);
  const invoiceNo  = await buildInvoiceNo();

  const invoiceData = {
    customerId,
    branchId,
    appointmentId:     appointmentId ?? null,
    invoiceNo,
    invoiceDate:       new Date(),
    subtotal:          totalSubtotal,
    totalDiscount,
    grandTotal,
    paidAmount:        D("0"),
    outstandingAmount: grandTotal,
    status:            "UNPAID",
    notes:             notes ?? null,
  };

  return createWithTransaction({
    invoiceData,
    itemsData,
    sessionIds: treatmentSessionIds ?? [],
    userId,
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

  return cancelWithTransaction({ invoice, userId });
};

module.exports = { listInvoices, getInvoiceById, createInvoice, cancelInvoice };
