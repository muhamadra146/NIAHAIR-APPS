// ── Finance Dashboard Types ───────────────────────────────────────────────────

export interface DailyTrendPoint {
  date:         string;   // "YYYY-MM-DD"
  revenue:      number;
  invoiceCount: number;
  cashReceived: number;
  paymentCount: number;
}

export interface CommissionByStatus {
  amount: number;
  count:  number;
}

export interface FinanceDashboardData {
  period: {
    startDate: string | null;
    endDate:   string | null;
  };
  revenue: {
    total:        number;
    paidAmount:   number;
    outstanding:  number;
    invoiceCount: number;
    paidCount:    number;
    paidTotal:    number;
  };
  cashReceived: {
    total:        number;
    paymentCount: number;
  };
  purchases: {
    total:        number;
    invoiceCount: number;
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
