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
  ktpFile?:          File;
  contractFile?:     File;
}

export interface UpdateEmployeeBranchesInput {
  branchIds: string[];
}

export interface UpdateEmployeeInput {
  name?:              string;
  roleId?:            string;
  employeeCode?:      string;
  phone?:             string;
  email?:             string;
  hireDate?:          string;
  birthDate?:         string;
  address?:           string;
  emergencyContact?:  string;
  nikKtp?:            string;
  resignDate?:        string;
  commissionEnabled?: boolean;
  isActive?:          boolean;
  payDay?:            number | null;
  homeBranchId?:      string | null;
  ktpFile?:           File;
  contractFile?:      File;
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
  effectiveDate:                 string;
  endDate?:                      string;
  isActive?:                     boolean;
  notes?:                        string;
}

export type UpdateSalarySettingInput = Partial<Omit<CreateSalarySettingInput, "employeeId">>;
