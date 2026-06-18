import { z } from "zod";

export const createEmployeeSchema = z.object({
  name:              z.string().min(1, "Nama wajib diisi"),
  roleId:            z.string().min(1, "Role wajib dipilih"),
  employeeCode:      z.string().optional().or(z.literal("")),
  phone:             z.string().optional().or(z.literal("")),
  email:             z.string().email("Format email tidak valid").optional().or(z.literal("")),
  hireDate:          z.string().optional().or(z.literal("")),
  birthDate:         z.string().optional().or(z.literal("")),
  address:           z.string().optional().or(z.literal("")),
  emergencyContact:  z.string().optional().or(z.literal("")),
  commissionEnabled: z.boolean().default(false),
  homeBranchId:      z.string().optional().or(z.literal("")),
  branchIds:         z.array(z.string()).default([]),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const salarySettingSchema = z.object({
  baseSalary:                    z.coerce.number().min(0, "Min 0"),
  mealAllowancePerDay:           z.coerce.number().min(0).default(0),
  transportAllowance:            z.coerce.number().min(0).default(0),
  overtimeRatePerHour:           z.coerce.number().min(0).default(0),
  holidayOvertimeRate:           z.coerce.number().min(0).default(0),
  lateDeductionPerMinute:        z.coerce.number().min(0).default(0),
  absentDeductionPerDay:         z.coerce.number().min(0).default(0),
  earlyLeaveDeductionPerMinute:  z.coerce.number().min(0).default(0),
  bpjsJhtPercent:                z.coerce.number().min(0).max(100).default(2),
  bpjsJpPercent:                 z.coerce.number().min(0).max(100).default(1),
  effectiveDate:                 z.string().min(1, "Tanggal berlaku wajib diisi"),
  endDate:                       z.string().optional().or(z.literal("")),
  isActive:                      z.boolean().default(true),
  notes:                         z.string().optional().or(z.literal("")),
});

export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;
export type SalarySettingFormValues  = z.infer<typeof salarySettingSchema>;
