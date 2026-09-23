export interface SummaryReport {
  invoices: {
    total:        number;
    paid:         number;
    totalRevenue: number | string;
  };
  deposits: {
    total:       number;
    totalAmount: number | string;
  };
  appointments: {
    total:    number;
    byStatus: Record<string, number>;
  };
  loans: {
    active: number;
  };
  commissions: {
    total:       number;
    totalAmount: number | string;
  };
}

export interface DailyRevenue {
  date:         string;
  invoiceCount: number;
  revenue:      number | string;
}

export interface CommissionByEmployee {
  employeeId:  string;
  employee:    { id: string; name: string; employeeCode: string | null } | null;
  total:       number;
  totalAmount: number | string;
  pending:     number | string;
  approved:    number | string;
  paid:        number | string;
}

export interface SalesByItem {
  itemId:             string;
  itemCode:           string;
  name:               string;
  itemType:           "INVENTORY" | "SERVICE";
  categoryId:         string | null;
  categoryName:       string | null;
  parentCategoryId:   string | null;
  parentCategoryName: string | null;
  totalQty:           number;
  totalRevenue:       number | string;
  invoiceCount:       number;
  cumPct:             number;
}

export interface ReportParams {
  branchId?:  string;
  startDate?: string;
  endDate?:   string;
}

// ── Inventory Report ──────────────────────────────────────────────────────────

export interface InventoryReportItem {
  itemId:       string;
  itemCode:     string;
  name:         string;
  itemType:     "INVENTORY" | "SERVICE";
  categoryName: string | null;
  qtyOnHand:    number;
  qtyReserved:  number;
  qtyAvailable: number;
  isLowStock:   boolean;
}

export interface InventoryWarehouseGroup {
  warehouse:   { id: string; name: string };
  totalSKU:    number;
  lowStockSKU: number;
  items:       InventoryReportItem[];
}

export interface InventoryReport {
  summary: {
    totalSKU:          number;
    lowStockSKU:       number;
    warehouseCount:    number;
    lowStockThreshold: number;
  };
  byWarehouse: InventoryWarehouseGroup[];
}

// ── Production Report ─────────────────────────────────────────────────────────

export interface ProductionOutputItem {
  id:            string;
  name:          string;
  itemCode:      string;
  totalProduced: number;
}

export interface ProductionMaterialItem {
  id:        string;
  name:      string;
  itemCode:  string;
  totalUsed: number;
}

export interface ProductionRecentOrder {
  id:                string;
  productionNo:      string;
  productionDate:    string;
  status:            string;
  totalProduced:     number;
  totalMaterialUsed: number;
}

export interface ProductionReport {
  summary: {
    totalOrders: number;
    byStatus:    Record<string, number>;
  };
  topOutputItems: ProductionOutputItem[];
  topMaterials:   ProductionMaterialItem[];
  recentOrders:   ProductionRecentOrder[];
}

// ── Customer Analytics ────────────────────────────────────────────────────────

export interface CustomerAnalyticsRow {
  customerId:       string;
  customer:         { id: string; name: string; customerNo: string | null; mobilePhone: string | null } | null;
  totalSpent:       number;
  visitCount:       number;
  avgSpentPerVisit: number;
  firstVisit:       string;
  lastVisit:        string;
}

export interface CustomerAnalytics {
  summary: {
    totalCustomers: number;
    totalRevenue:   number;
    avgPerCustomer: number;
    totalInvoices:  number;
  };
  topCustomers: CustomerAnalyticsRow[];
}
