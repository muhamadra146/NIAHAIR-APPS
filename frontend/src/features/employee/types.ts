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
  roleId:           string;
  role:             EmployeeRole;
  commissionEnabled: boolean;
  isActive:         boolean;
  homeBranchId:     string | null;
  employeeBranches: EmployeeBranch[];
  createdAt:        string;
  updatedAt:        string;
}

export interface SalarySetting {
  id:                           string;
  employeeId:                   string;
  baseSalary:                   string;
  mealAllowancePerDay:          string;
  transportAllowance:           string;
  overtimeRatePerHour:          string;
  holidayOvertimeRate:          string;
  lateDeductionPerMinute:       string;
  absentDeductionPerDay:        string;
  earlyLeaveDeductionPerMinute: string;
  bpjsJhtPercent:               string;
  bpjsJpPercent:                string;
  effectiveDate:                string;
  endDate:                      string | null;
  isActive:                     boolean;
  notes:                        string | null;
  createdAt:                    string;
  updatedAt:                    string;
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
  commissionEnabled?: boolean;
  homeBranchId?:     string | null;
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
  commissionEnabled?: boolean;
  isActive?:          boolean;
  homeBranchId?:      string | null;
}

export interface CreateSalarySettingInput {
  employeeId:                    string;
  baseSalary:                    number;
  mealAllowancePerDay?:          number;
  transportAllowance?:           number;
  overtimeRatePerHour?:          number;
  holidayOvertimeRate?:          number;
  lateDeductionPerMinute?:       number;
  absentDeductionPerDay?:        number;
  earlyLeaveDeductionPerMinute?: number;
  bpjsJhtPercent?:               number;
  bpjsJpPercent?:                number;
  effectiveDate:                 string;
  endDate?:                      string;
  isActive?:                     boolean;
  notes?:                        string;
}

export type UpdateSalarySettingInput = Partial<Omit<CreateSalarySettingInput, "employeeId">>;
