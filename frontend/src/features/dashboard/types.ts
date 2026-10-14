// ── Finance Dashboard Types ───────────────────────────────────────────────────

export interface DailyTrendPoint {
  date:      string;   // "YYYY-MM-DD"
  gross:     number;
  netBefore: number;
  netAfter:  number;
}

export interface CommissionByStatus {
  amount: number;
  count:  number;
}

/** Potongan dari pendapatan kotor (FIN-039) */
export interface IncomeDeductions {
  tax:        number;   // PPN
  ongkosPP:   number;
  lemburTeam: number;   // 50% Charge Lembur bagian tim
  hsTeam:     number;   // komisi tim Home Service
  commission: number;   // komisi staf lainnya
}

/** Pendapatan kotor & bersih — uang client pada tanggal bayar */
export interface IncomeSummary {
  gross:      number;
  netBefore:  number;   // bersih sebelum komisi
  netAfter:   number;   // bersih setelah komisi
  deductions: IncomeDeductions;
  breakdown: {
    invoicePayments:     number;
    invoicePaymentCount: number;
    depositPayments:     number;
    depositPaymentCount: number;
    refunds:             number;
    refundCount:         number;
  };
  /** Invoice yang Input Pekerjaan-nya belum diisi — komisinya belum ikut dipotong */
  commissionPendingInvoices: number;
}

export interface FinanceDashboardData {
  period: {
    startDate: string | null;
    endDate:   string | null;
  };
  income: IncomeSummary;
  /** Invoice terbit (tanggal invoice) — untuk piutang */
  invoices: {
    total:        number;
    paidAmount:   number;
    outstanding:  number;
    invoiceCount: number;
    paidCount:    number;
    paidTotal:    number;
  };
  purchases: {
    total:        number;
    invoiceCount: number;
    warehouses:   string[];
  };
  commissions: {
    total:   number;
    count:   number;
    byStatus: Record<string, CommissionByStatus>;
  };
  payroll: {
    total:           number;
    grossIncome:     number;
    totalDeductions: number;
    count:           number;
    employeeCount:   number;
  };
  netCashFlow: number;
  dailyTrend:  DailyTrendPoint[];
}

export type IncomeRowType = "INVOICE_PAYMENT" | "DEPOSIT_PAYMENT" | "DEPOSIT_APPLIED" | "DEPOSIT_REFUND";

export interface IncomeRow {
  type:         IncomeRowType;
  date:         string;
  ref:          string | null;
  invoiceId:    string | null;
  invoiceNo:    string | null;
  depositId:    string | null;
  customerName: string | null;
  gross:        number;
  netBefore:    number;
  netAfter:     number;
  deductions:   IncomeDeductions;
  commissionPending: boolean;
}

export interface PurchaseRow {
  id:                string;
  invoiceNo:         string;
  supplierInvoiceNo: string | null;
  invoiceDate:       string;
  grandTotal:        number;
  supplier:          { name: string } | null;
  warehouse:         { name: string } | null;
}

export type FinanceDetails =
  | { type: "revenue";   rows: IncomeRow[];   summary: IncomeSummary }
  | { type: "purchases"; rows: PurchaseRow[]; summary: { total: number; count: number } };
