export interface EmployeeRole {
  id:       string;
  code:     string;
  name:     string;
  isActive: boolean;
}

export interface EmployeeBranch {
  id:        string;
  branchId:  string;
  isPrimary: boolean;
  isActive:  boolean;
  branch:    { id: string; code: string; name: string };
}

// PPh 21 (PAY-037)
export const PTKP_STATUSES = ["TK0", "TK1", "TK2", "TK3", "K0", "K1", "K2", "K3"] as const;
export type PtkpStatus = typeof PTKP_STATUSES[number];
export const PTKP_LABEL: Record<PtkpStatus, string> = {
  TK0: "TK/0 — tidak kawin, tanpa tanggungan",
  TK1: "TK/1 — tidak kawin, 1 tanggungan",
  TK2: "TK/2 — tidak kawin, 2 tanggungan",
  TK3: "TK/3 — tidak kawin, 3 tanggungan",
  K0:  "K/0 — kawin, tanpa tanggungan",
  K1:  "K/1 — kawin, 1 tanggungan",
  K2:  "K/2 — kawin, 2 tanggungan",
  K3:  "K/3 — kawin, 3 tanggungan",
};

export const TAX_EMPLOYMENT_TYPES = ["PERMANENT", "NON_PERMANENT"] as const;
export type TaxEmploymentType = typeof TAX_EMPLOYMENT_TYPES[number];
export const TAX_EMPLOYMENT_LABEL: Record<TaxEmploymentType, string> = {
  PERMANENT:     "Tetap (termasuk kontrak bulanan)",
  NON_PERMANENT: "Tidak Tetap",
};

export interface Employee {
  id:               string;
  employeeCode:     string;
  name:             string;
  phone:            string | null;
  email:            string | null;
  hireDate:         string | null;
  birthDate:        string | null;
  address:          string | null;
  emergencyContact: string | null;
  nikKtp:               string | null;
  ktpFileUrl:           string | null;
  ktpFilePublicId:      string | null;
  resignDate:           string | null;
  contractFileUrl:      string | null;
  contractFilePublicId: string | null;
  roleId:           string;
  role:             EmployeeRole;
  commissionEnabled: boolean;
  isActive:         boolean;
  payDay:           number | null;
  homeBranchId:     string | null;
  homeBranch:       { id: string; code: string; name: string } | null;
  divisionId?:        string | null;
  isDivisionManager?: boolean;
  division?:          { id: string; code: string; name: string } | null;
  /** PPh 21 — hanya untuk peran yang melihat data lengkap */
  ptkpStatus?:        PtkpStatus | null;
  taxEmploymentType?: TaxEmploymentType;
  /** Akun login karyawan (hanya untuk peran yang melihat data lengkap) */
  user?:              { id: string; email: string } | null;
  employeeBranches: EmployeeBranch[];
  createdAt:        string;
  updatedAt:        string;
}

export interface SalarySetting {
  id:                            string;
  employeeId:                    string;
  baseSalary:                    string;
  mealAllowancePerDay:           string;
  tunjangan:                     string;
  transportAllowance:            string;
  overtimeRatePerHour:           string;
  holidayRatePerDay:             string;
  lateDeductionBracket1:         string;
  lateDeductionBracket2:         string;
  lateDeductionBracket3:         string;
  absentDeductionPerDay:         string;
  earlyLeaveDeductionPerMinute:  string;
  bpjsJhtPercent:                string;
  bpjsJhtEmployerPercent:        string;
  bpjsJpPercent:                 string;
  bpjsJpEmployerPercent:         string;
  bpjsKesehatanEmployeePercent:  string;
  bpjsKesehatanEmployerPercent:  string;
  bpjsJkkEmployerPercent?:       string;
  bpjsJkmEmployerPercent?:       string;
  effectiveDate:                 string;
  endDate:                       string | null;
  isActive:                      boolean;
  notes:                         string | null;
  createdAt:                     string;
  updatedAt:                     string;
}

export interface EmployeeListParams {
  page?:     number;
  limit?:    number;
  search?:   string;
  isActive?: boolean;
  branchId?: string;
}

export interface CreateEmployeeInput {
  name:              string;
  roleId:            string;
  employeeCode?:     string;
  phone?:            string;
  email?:            string;
  hireDate?:         string;
  birthDate?:        string;
  address?:          string;
  emergencyContact?: string;
  nikKtp?:           string;
  resignDate?:       string;
  commissionEnabled?: boolean;
  payDay?:           number | null;
  homeBranchId?:     string | null;
  divisionId?:        string | null;
  isDivisionManager?: boolean;
  ptkpStatus?:        PtkpStatus | null;
  taxEmploymentType?: TaxEmploymentType;
}

export interface UpdateEmployeeBranchesInput {
  branchIds: string[];
}

// null = kosongkan kolom opsional (B4)
export interface UpdateEmployeeInput {
  name?:              string;
  roleId?:            string;
  employeeCode?:      string;
  phone?:             string | null;
  email?:             string | null;
  hireDate?:          string | null;
  birthDate?:         string | null;
  address?:           string | null;
  emergencyContact?:  string | null;
  nikKtp?:            string | null;
  resignDate?:        string | null;
  commissionEnabled?: boolean;
  isActive?:          boolean;
  payDay?:            number | null;
  homeBranchId?:      string | null;
  divisionId?:        string | null;
  isDivisionManager?: boolean;
  ptkpStatus?:        PtkpStatus | null;
  taxEmploymentType?: TaxEmploymentType;
}

export interface UploadEmployeeFilesInput {
  ktpFile?:      File | null;
  contractFile?: File | null;
}

export interface CreateSalarySettingInput {
  employeeId:                    string;
  baseSalary:                    number;
  mealAllowancePerDay?:          number;
  tunjangan?:                    number;
  transportAllowance?:           number;
  overtimeRatePerHour?:          number;
  holidayRatePerDay?:            number;
  lateDeductionBracket1?:        number;
  lateDeductionBracket2?:        number;
  lateDeductionBracket3?:        number;
  absentDeductionPerDay?:        number;
  earlyLeaveDeductionPerMinute?: number;
  bpjsJhtPercent?:               number;
  bpjsJhtEmployerPercent?:       number;
  bpjsJpPercent?:                number;
  bpjsJpEmployerPercent?:        number;
  bpjsKesehatanEmployeePercent?: number;
  bpjsKesehatanEmployerPercent?: number;
  bpjsJkkEmployerPercent?:       number;
  bpjsJkmEmployerPercent?:       number;
  effectiveDate:                 string;
  endDate?:                      string;
  isActive?:                     boolean;
  notes?:                        string;
}

export type UpdateSalarySettingInput = Partial<Omit<CreateSalarySettingInput, "employeeId">>;
