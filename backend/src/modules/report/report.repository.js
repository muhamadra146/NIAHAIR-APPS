const prisma = require("../../config/prisma");
const { Prisma } = require("@prisma/client");

// ── helpers ───────────────────────────────────────────────────────────────────

function dateWhere(startDate, endDate, field = "createdAt") {
  const filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate)   filter.lte = new Date(endDate + "T23:59:59.999Z");
  return Object.keys(filter).length ? { [field]: filter } : {};
}

// ── Summary ───────────────────────────────────────────────────────────────────

const getSummary = async ({ branchId, startDate, endDate }) => {
  const branchFilter = branchId ? { branchId } : {};
  const dateInvoice  = dateWhere(startDate, endDate, "invoiceDate");
  const dateCr       = dateWhere(startDate, endDate, "createdAt");

  const [
    invoiceStats,
    paidInvoiceStats,
    depositStats,
    appointmentTotal,
    appointmentByStatus,
    activeLoans,
    commissionStats,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...branchFilter, ...dateInvoice },
      _count: { _all: true },
      _sum:   { grandTotal: true },
    }),
    prisma.invoice.aggregate({
      where: { ...branchFilter, ...dateInvoice, status: "PAID" },
      _count: { _all: true },
      _sum:   { grandTotal: true },
    }),
    prisma.deposit.aggregate({
      where: { ...branchFilter, ...dateCr, status: { in: ["PAID", "PARTIAL_USED", "USED"] } },
      _count: { _all: true },
      _sum:   { amount: true },
    }),
    prisma.appointment.count({
      where: { ...branchFilter, ...dateWhere(startDate, endDate, "visitDate") },
    }),
    prisma.appointment.groupBy({
      by:     ["status"],
      where:  { ...branchFilter, ...dateWhere(startDate, endDate, "visitDate") },
      _count: { _all: true },
    }),
    prisma.loan.count({ where: { status: "ACTIVE", ...branchFilter } }),
    prisma.commission.aggregate({
      where: { ...dateCr },
      _count: { _all: true },
      _sum:   { commissionAmount: true },
    }),
  ]);

  const apptByStatus = appointmentByStatus.reduce(
    (acc, r) => { acc[r.status] = r._count._all; return acc; },
    {},
  );

  return {
    invoices: {
      total:        invoiceStats._count._all,
      paid:         paidInvoiceStats._count._all,
      totalRevenue: paidInvoiceStats._sum.grandTotal ?? new Prisma.Decimal(0),
    },
    deposits: {
      total:       depositStats._count._all,
      totalAmount: depositStats._sum.amount ?? new Prisma.Decimal(0),
    },
    appointments: {
      total:    appointmentTotal,
      byStatus: apptByStatus,
    },
    loans: {
      active: activeLoans,
    },
    commissions: {
      total:       commissionStats._count._all,
      totalAmount: commissionStats._sum.commissionAmount ?? new Prisma.Decimal(0),
    },
  };
};

// ── Daily revenue ─────────────────────────────────────────────────────────────

const getDailyRevenue = async ({ branchId, startDate, endDate }) => {
  // NOTE: columns in the "invoices" table use camelCase (Prisma convention),
  // so raw SQL must quote them exactly: "branchId", "invoiceDate", "grandTotal".
  const conditions = ["status = 'PAID'"];
  const values     = [];
  let   idx        = 1;

  if (branchId) {
    conditions.push(`"branchId" = $${idx++}`);
    values.push(branchId);
  }
  if (startDate) {
    conditions.push(`"invoiceDate" >= $${idx++}`);
    values.push(new Date(startDate));
  }
  if (endDate) {
    conditions.push(`"invoiceDate" <= $${idx++}`);
    values.push(new Date(endDate + "T23:59:59.999Z"));
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       DATE("invoiceDate")      AS date,
       COUNT(*)::int            AS invoice_count,
       SUM("grandTotal")        AS revenue
     FROM invoices
     ${where}
     GROUP BY DATE("invoiceDate")
     ORDER BY date ASC`,
    ...values,
  );

  return rows.map((r) => ({
    // pg returns PostgreSQL `date` type as a string "YYYY-MM-DD", not a Date object.
    // Guard against both: string (pg default) and Date (in case of custom parser).
    date:         r.date instanceof Date
      ? r.date.toISOString().slice(0, 10)
      : String(r.date).slice(0, 10),
    invoiceCount: r.invoice_count,
    revenue:      r.revenue,
  }));
};

// ── Commission by employee ────────────────────────────────────────────────────

const getCommissionByEmployee = async ({ branchId, startDate, endDate }) => {
  const dateCr = dateWhere(startDate, endDate, "createdAt");

  // groupBy tidak support relation filter — pre-fetch employee IDs dulu jika branchId ada
  let employeeIdFilter = {};
  if (branchId) {
    const branchEmployees = await prisma.employee.findMany({
      where:  { homeBranchId: branchId },
      select: { id: true },
    });
    const ids = branchEmployees.map((e) => e.id);
    if (ids.length === 0) return [];
    employeeIdFilter = { employeeId: { in: ids } };
  }

  const rows = await prisma.commission.groupBy({
    by:     ["employeeId"],
    where:  { ...dateCr, ...employeeIdFilter },
    _count: { _all: true },
    _sum:   { commissionAmount: true },
  });

  if (rows.length === 0) return [];

  const employeeIds = rows.map((r) => r.employeeId);
  const employees   = await prisma.employee.findMany({
    where:  { id: { in: employeeIds } },
    select: { id: true, name: true, employeeCode: true },
  });
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const byStatus = await prisma.commission.groupBy({
    by:    ["employeeId", "status"],
    where: { employeeId: { in: employeeIds }, ...dateCr },
    _sum:  { commissionAmount: true },
  });

  const statusMap = {};
  for (const r of byStatus) {
    if (!statusMap[r.employeeId]) statusMap[r.employeeId] = {};
    statusMap[r.employeeId][r.status] = r._sum.commissionAmount ?? 0;
  }

  return rows
    .sort((a, b) =>
      Number(b._sum.commissionAmount ?? 0) - Number(a._sum.commissionAmount ?? 0),
    )
    .map((r) => ({
      employeeId:  r.employeeId,
      employee:    empMap[r.employeeId] ?? null,
      total:       r._count._all,
      totalAmount: r._sum.commissionAmount ?? 0,
      pending:     statusMap[r.employeeId]?.PENDING  ?? 0,
      approved:    statusMap[r.employeeId]?.APPROVED ?? 0,
      paid:        statusMap[r.employeeId]?.PAID     ?? 0,
    }));
};

// ── Sales by item (Pareto) ────────────────────────────────────────────────────

const getSalesByItem = async ({ branchId, startDate, endDate }) => {
  const invoiceWhere = { status: "PAID" };
  if (branchId) invoiceWhere.branchId = branchId;
  if (startDate || endDate) {
    invoiceWhere.invoiceDate = {};
    if (startDate) invoiceWhere.invoiceDate.gte = new Date(startDate);
    if (endDate)   invoiceWhere.invoiceDate.lte = new Date(endDate + "T23:59:59.999Z");
  }

  const rows = await prisma.invoiceItem.findMany({
    where: { invoice: invoiceWhere },
    select: {
      itemId:    true,
      qty:       true,
      subtotal:  true,
      invoiceId: true,
      item: {
        select: {
          itemCode: true,
          name:     true,
          itemType: true,
          category: {
            select: {
              id: true, name: true,
              parent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // Group by itemId in JavaScript
  const map = {};
  for (const r of rows) {
    if (!map[r.itemId]) {
      map[r.itemId] = {
        itemId:             r.itemId,
        itemCode:           r.item.itemCode,
        name:               r.item.name,
        itemType:           r.item.itemType,
        categoryId:         r.item.category?.id            ?? null,
        categoryName:       r.item.category?.name          ?? null,
        parentCategoryId:   r.item.category?.parent?.id    ?? null,
        parentCategoryName: r.item.category?.parent?.name  ?? null,
        totalQty:           0,
        totalRevenue:       0,
        invoiceIds:         new Set(),
      };
    }
    map[r.itemId].totalQty     += Number(r.qty);
    map[r.itemId].totalRevenue += Number(r.subtotal);
    map[r.itemId].invoiceIds.add(r.invoiceId);
  }

  const sorted = Object.values(map)
    .sort((a, b) => b.totalQty - a.totalQty);

  const totalQty = sorted.reduce((s, r) => s + r.totalQty, 0);
  let cumQty = 0;

  return sorted.map((r) => {
    cumQty += r.totalQty;
    return {
      itemId:             r.itemId,
      itemCode:           r.itemCode,
      name:               r.name,
      itemType:           r.itemType,
      categoryId:         r.categoryId,
      categoryName:       r.categoryName,
      parentCategoryId:   r.parentCategoryId,
      parentCategoryName: r.parentCategoryName,
      totalQty:           r.totalQty,
      totalRevenue:       r.totalRevenue,
      invoiceCount:       r.invoiceIds.size,
      cumPct:             totalQty > 0 ? Math.round((cumQty / totalQty) * 1000) / 10 : 0,
    };
  });
};

// ── Inventory Report ──────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 10;

const getInventoryReport = async ({ branchId }) => {
  const inventories = await prisma.inventory.findMany({
    where: {
      item:      { isActive: true },
      warehouse: { isActive: true, ...(branchId ? { branchId } : {}) },
    },
    select: {
      qtyOnHand:    true,
      qtyReserved:  true,
      qtyAvailable: true,
      warehouse: { select: { id: true, name: true } },
      item: {
        select: {
          id: true, itemCode: true, name: true, itemType: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { qtyAvailable: "asc" }],
  });

  const warehouseMap = {};
  let totalSKU = 0;
  let lowStockSKU = 0;

  for (const inv of inventories) {
    const wid   = inv.warehouse.id;
    const qty   = Number(inv.qtyAvailable);
    const isLow = qty <= LOW_STOCK_THRESHOLD;

    if (!warehouseMap[wid]) {
      warehouseMap[wid] = {
        warehouse:   inv.warehouse,
        totalSKU:    0,
        lowStockSKU: 0,
        items:       [],
      };
    }

    warehouseMap[wid].totalSKU++;
    if (isLow) warehouseMap[wid].lowStockSKU++;
    totalSKU++;
    if (isLow) lowStockSKU++;

    warehouseMap[wid].items.push({
      itemId:       inv.item.id,
      itemCode:     inv.item.itemCode,
      name:         inv.item.name,
      itemType:     inv.item.itemType,
      categoryName: inv.item.category?.name ?? null,
      qtyOnHand:    Number(inv.qtyOnHand),
      qtyReserved:  Number(inv.qtyReserved),
      qtyAvailable: qty,
      isLowStock:   isLow,
    });
  }

  return {
    summary: {
      totalSKU,
      lowStockSKU,
      warehouseCount:    Object.keys(warehouseMap).length,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
    byWarehouse: Object.values(warehouseMap),
  };
};

// ── Production Report ─────────────────────────────────────────────────────────

const getProductionReport = async ({ startDate, endDate }) => {
  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate)   dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
  const whereDate = Object.keys(dateFilter).length ? { productionDate: dateFilter } : {};

  const [orders, byStatus] = await Promise.all([
    prisma.productionOrder.findMany({
      where:   whereDate,
      select: {
        id:             true,
        productionNo:   true,
        productionDate: true,
        status:         true,
        items: {
          select: {
            producedQuantity: true,
            item: { select: { id: true, name: true, itemCode: true } },
          },
        },
        materials: {
          select: {
            actualQuantity: true,
            item: { select: { id: true, name: true, itemCode: true } },
          },
        },
      },
      orderBy: { productionDate: "desc" },
    }),
    prisma.productionOrder.groupBy({
      by:    ["status"],
      where: whereDate,
      _count: { _all: true },
    }),
  ]);

  const statusBreakdown = byStatus.reduce((acc, r) => {
    acc[r.status] = r._count._all;
    return acc;
  }, {});

  const itemOutputMap = {};
  const materialMap   = {};

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.item.id;
      if (!itemOutputMap[key]) itemOutputMap[key] = { ...item.item, totalProduced: 0 };
      itemOutputMap[key].totalProduced += Number(item.producedQuantity);
    }
    for (const mat of order.materials) {
      const key = mat.item.id;
      if (!materialMap[key]) materialMap[key] = { ...mat.item, totalUsed: 0 };
      materialMap[key].totalUsed += Number(mat.actualQuantity);
    }
  }

  return {
    summary: {
      totalOrders: orders.length,
      byStatus:    statusBreakdown,
    },
    topOutputItems: Object.values(itemOutputMap)
      .sort((a, b) => b.totalProduced - a.totalProduced)
      .slice(0, 20),
    topMaterials: Object.values(materialMap)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 20),
    recentOrders: orders.slice(0, 30).map((o) => ({
      id:                o.id,
      productionNo:      o.productionNo,
      productionDate:    o.productionDate,
      status:            o.status,
      totalProduced:     o.items.reduce((s, i) => s + Number(i.producedQuantity), 0),
      totalMaterialUsed: o.materials.reduce((s, m) => s + Number(m.actualQuantity), 0),
    })),
  };
};

// ── Customer Analytics ────────────────────────────────────────────────────────

const getCustomerAnalytics = async ({ branchId, startDate, endDate }) => {
  const invoiceWhere = { status: "PAID", customerId: { not: null } };
  if (branchId)  invoiceWhere.branchId = branchId;
  if (startDate || endDate) {
    invoiceWhere.invoiceDate = {};
    if (startDate) invoiceWhere.invoiceDate.gte = new Date(startDate);
    if (endDate)   invoiceWhere.invoiceDate.lte = new Date(endDate + "T23:59:59.999Z");
  }

  const invoices = await prisma.invoice.findMany({
    where:  invoiceWhere,
    select: {
      id:          true,
      customerId:  true,
      grandTotal:  true,
      invoiceDate: true,
      customer:    { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
    },
  });

  const customerMap = {};
  for (const inv of invoices) {
    const cid = inv.customerId;
    if (!customerMap[cid]) {
      customerMap[cid] = {
        customerId:  cid,
        customer:    inv.customer,
        totalSpent:  0,
        visitCount:  0,
        firstVisit:  inv.invoiceDate,
        lastVisit:   inv.invoiceDate,
      };
    }
    customerMap[cid].totalSpent += Number(inv.grandTotal);
    customerMap[cid].visitCount++;
    if (inv.invoiceDate < customerMap[cid].firstVisit) customerMap[cid].firstVisit = inv.invoiceDate;
    if (inv.invoiceDate > customerMap[cid].lastVisit)  customerMap[cid].lastVisit  = inv.invoiceDate;
  }

  const sorted = Object.values(customerMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .map((c) => ({
      customerId:       c.customerId,
      customer:         c.customer,
      totalSpent:       c.totalSpent,
      visitCount:       c.visitCount,
      avgSpentPerVisit: c.visitCount > 0 ? Math.round(c.totalSpent / c.visitCount) : 0,
      firstVisit:       c.firstVisit,
      lastVisit:        c.lastVisit,
    }));

  const totalCustomers = sorted.length;
  const totalRevenue   = sorted.reduce((s, c) => s + c.totalSpent, 0);

  return {
    summary: {
      totalCustomers,
      totalRevenue,
      avgPerCustomer:  totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0,
      totalInvoices:   invoices.length,
    },
    topCustomers: sorted.slice(0, 30),
  };
};

module.exports = {
  getSummary, getDailyRevenue, getCommissionByEmployee, getSalesByItem,
  getInventoryReport, getProductionReport, getCustomerAnalytics,
};
