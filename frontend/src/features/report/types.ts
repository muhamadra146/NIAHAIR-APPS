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

export interface ReportParams {
  branchId?:  string;
  startDate?: string;
  endDate?:   string;
}
