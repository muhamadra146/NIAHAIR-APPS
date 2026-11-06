export type PayrollStatus   = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PAID";
export type PayrollItemType = "INCOME" | "DEDUCTION";

export interface PayrollItem {
  id:        string;
  payrollId: string;
  type:      PayrollItemType;
  category:  string;
  label:     string;
  amount:    number;
  quantity:  number | null;
  rate:      number | null;
  isAuto:    boolean;
  notes:     string | null;
}

/** Status PTKP singkat (TK/0 …) untuk tampilan PPh 21 */
export const PTKP_SHORT: Record<string, string> = {
  TK0: "TK/0", TK1: "TK/1", TK2: "TK/2", TK3: "TK/3", K0: "K/0", K1: "K/1", K2: "K/2", K3: "K/3",
};

/** Masa pajak "2027-01" → "Januari 2027" */
export const fmtTaxPeriod = (taxPeriod: string) => {
  const [y, m] = taxPeriod.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
};

export interface PayrollAccurateSync {
  status:       "SYNCED" | "PENDING" | "FAILED";
  /** Alasan gagal terakhir (FAILED, atau PENDING yang akan dicoba ulang otomatis) */
  errorMessage: string | null;
  jobId:        string | null;
}

export interface CommissionBreakdownItem {
  id:               string;
  commissionAmount: number;
  approvedAt:       string;
  treatmentName:    string;
}

export interface Payroll {
  id:             string;
  employeeId:     string;
  branchId:       string;
  periodStart:    string;
  periodEnd:      string;
  status:         PayrollStatus;
  grossIncome:    number;
  totalDeductions: number;
  netSalary:      number;
  approvedBy:     string | null;
  approvedAt:     string | null;
  paidAt:         string | null;
  notes:          string | null;
  // Accurate Online sync (Jurnal Umum)
  accurateJournalId:     string | null;
  accurateJournalNumber: string | null;
  lastSyncAt:            string | null;
  /** Status jurnal Accurate (hanya payroll PAID) dari antrian sync */
  accurateSync?:         PayrollAccurateSync | null;
  // PPh 21 (PAY-037) — taxPeriod null = slip di luar ruang lingkup (tanggal gajian < 2027-01-01)
  taxPeriod?:     string | null;
  taxPtkpStatus?: string | null;
  taxGross?:      number | string | null;
  taxMethod?:     "TER" | "ANNUAL" | null;
  taxTerRate?:    number | string | null;
  pph21?:         number | string;
  createdAt:      string;
  updatedAt:      string;
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    role:         { id: string; code: string; name: string };
    homeBranch:   { id: string; code: string; name: string } | null;
  };
  branch: { id: string; code: string; name: string };
  items:  PayrollItem[];
  commissionBreakdown?: CommissionBreakdownItem[];
  /** Hanya pada respons generate: celah periode dari payroll sebelumnya */
  warnings?: string[];
}

/** GET /payroll/period-preview — periode sebelum generate (COM-017) */
export interface PayrollPeriodPreview {
  yearMonth:   string | null;  // bulan kerja = nama gaji (null pada mode rentang)
  payDay:      number | null;
  periodStart: string;
  periodEnd:   string;
  payDate:     string | null;
  conflict:    string | null;  // tumpang tindih → generate ditolak
  warnings:    string[];       // celah dari payroll sebelumnya
}

export interface PayrollPeriodPreviewParams {
  employeeId?:  string;
  payDay?:      number;
  yearMonth?:   string;
  periodStart?: string;
  periodEnd?:   string;
}

export interface GeneratePayrollInput {
  employeeId:   string;
  branchId:     string;
  yearMonth?:   string;
  periodStart?: string;
  periodEnd?:   string;
  notes?:       string;
}

export interface PayrollListParams {
  page?:       number;
  limit?:      number;
  employeeId?: string;
  branchId?:   string;
  status?:     PayrollStatus;
  yearMonth?:  string;
}

export interface BpjsReportRow {
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    role:         { name: string };
  };
  periodStart:           string;
  periodEnd:             string;
  status:                PayrollStatus;
  baseSalary:            number;
  bpjsJht:               number;
  bpjsJhtEmployer:       number;
  bpjsJp:                number;
  bpjsJpEmployer:        number;
  bpjsKesehatan:         number;
  bpjsKesehatanEmployer: number;
  bpjsJkkEmployer:       number;
  bpjsJkmEmployer:       number;
  totalEmployee:         number;
  totalEmployer:         number;
  totalBpjs:             number;
}

export interface BpjsReportTotals {
  baseSalary:            number;
  bpjsJht:               number;
  bpjsJhtEmployer:       number;
  bpjsJp:                number;
  bpjsJpEmployer:        number;
  bpjsKesehatan:         number;
  bpjsKesehatanEmployer: number;
  bpjsJkkEmployer:       number;
  bpjsJkmEmployer:       number;
  totalEmployee:         number;
  totalEmployer:         number;
  totalBpjs:             number;
}

export interface BpjsReportResult {
  data:    BpjsReportRow[];
  totals:  BpjsReportTotals;
  period:  { yearMonth: string; periodStart: string; periodEnd: string };
}

export interface BpjsReportParams {
  branchId?:  string;
  yearMonth:  string;
}

// Rekap Penghasilan (bahan PPh 21) — satu baris per karyawan
export interface IncomeRecapAmounts {
  gaji:                  number;
  tunjangan:             number;
  transport:             number;
  makan:                 number;
  komisi:                number;
  lembur:                number;
  bonus:                 number;
  payoutCuti:            number;
  lainnya:               number;
  totalIncome:           number;
  potonganAbsen:         number;
  bpjsJht:               number;
  bpjsJp:                number;
  bpjsKesehatan:         number;
  bpjsJhtEmployer:       number;
  bpjsJpEmployer:        number;
  bpjsKesehatanEmployer: number;
  bpjsJkkEmployer:       number;
  bpjsJkmEmployer:       number;
  /** Bruto pajak & PPh 21 tersimpan di slip (PAY-037); 0 untuk slip di luar ruang lingkup */
  taxGross:              number;
  pph21:                 number;
  netSalary:             number;
}

export interface IncomeRecapRow extends IncomeRecapAmounts {
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    nikKtp:       string | null;
    role:         { name: string };
  };
  slipCount:   number;
  periodStart: string;
  periodEnd:   string;
}

export interface IncomeRecapResult {
  data:   IncomeRecapRow[];
  totals: IncomeRecapAmounts;
  period: { mode: "MONTH" | "YEAR"; yearMonth: string | null; year: number | null; periodStart: string; periodEnd: string };
}

export interface IncomeRecapParams {
  branchId?:  string;
  yearMonth?: string;
  year?:      string;
}

export interface BulkGenerateInput {
  branchId:  string;
  payDay?:   number;
  yearMonth: string;
  notes?:    string;
}

export interface BulkGenerateResult {
  summary: { total: number; created: number; errors: number };
  results: Array<{
    employeeId:   string;
    employeeName: string;
    status:       "created" | "error";
    message?:     string;
    payrollId?:   string;
    warnings?:    string[];
  }>;
}
