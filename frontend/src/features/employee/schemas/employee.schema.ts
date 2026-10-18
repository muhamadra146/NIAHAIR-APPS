import { z } from "zod";
import { toWibDateStr } from "@/lib/utils";
import { PHONE_REGEX, PHONE_MESSAGE, cleanPhone, isRealDate } from "@/features/customer/schemas/customer.schema";

/** Tanggal opsional: harus tanggal yang benar-benar ada (2026-02-31 ditolak) */
const optionalDate = (label: string, notFuture = false) =>
  z.string().optional().or(z.literal(""))
    .refine((v) => !v || isRealDate(v), `${label} tidak valid`)
    .refine((v) => !notFuture || !v || v <= toWibDateStr(), `${label} tidak boleh di masa depan`);

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} maksimal ${max} karakter`).optional().or(z.literal(""));

// Tanggal gajian opsional: kosong = null (B13); input number kosong → "" / NaN
const payDaySchema = z.preprocess(
  (v) => (v === "" || v === undefined || v === null || (typeof v === "number" && Number.isNaN(v)) ? null : Number(v)),
  z.number({ message: "Tanggal gajian harus angka" })
    .int("Tanggal gajian harus bilangan bulat")
    .min(1, "Tanggal gajian harus antara 1 dan 31")
    .max(31, "Tanggal gajian harus antara 1 dan 31")
    .nullable(),
).optional();

export const createEmployeeSchema = z.object({
  name:              z.string().trim().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
  roleId:            z.string().min(1, "Role wajib dipilih"),
  employeeCode:      z.string().optional().or(z.literal("")),
  // No. HP: aturan sama dengan pelanggan (CRM-005)
  phone:             z.string().optional().or(z.literal(""))
    .transform((v) => (v ? cleanPhone(v) : v))
    .refine((v) => !v || PHONE_REGEX.test(v), PHONE_MESSAGE),
  email:             z.string().trim().max(100, "Email maksimal 100 karakter").email("Format email tidak valid").optional().or(z.literal("")),
  hireDate:          optionalDate("Tanggal masuk"),
  birthDate:         optionalDate("Tanggal lahir", true),
  address:           optionalText(500, "Alamat"),
  emergencyContact:  optionalText(150, "Kontak darurat"),
  nikKtp:            z.string().trim().optional().or(z.literal(""))
    .refine((v) => !v || /^\d{16}$/.test(v), "NIK KTP harus 16 digit angka"),
  resignDate:        optionalDate("Tanggal resign"),
  commissionEnabled: z.boolean().default(false),
  payDay:            payDaySchema,
  homeBranchId:      z.string().optional().or(z.literal("")),
  branchIds:         z.array(z.string()).default([]),
  divisionId:        z.string().optional().or(z.literal("")),
  isDivisionManager: z.boolean().default(false),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const salarySettingSchema = z.object({
  baseSalary:                    z.coerce.number().min(0, "Minimal 0"),
  mealAllowancePerDay:           z.coerce.number().min(0).default(0),
  tunjangan:                     z.coerce.number().min(0).default(0),
  transportAllowance:            z.coerce.number().min(0).default(0),
  overtimeRatePerHour:           z.coerce.number().min(0).default(0),
  holidayRatePerDay:             z.coerce.number().min(0).default(0),
  lateDeductionBracket1:         z.coerce.number().min(0).default(25000),
  lateDeductionBracket2:         z.coerce.number().min(0).default(50000),
  lateDeductionBracket3:         z.coerce.number().min(0).default(75000),
  absentDeductionPerDay:         z.coerce.number().min(0).default(0),
  earlyLeaveDeductionPerMinute:  z.coerce.number().min(0).default(0),
  bpjsJhtPercent:                z.coerce.number().min(0).max(100).default(2),
  bpjsJhtEmployerPercent:        z.coerce.number().min(0).max(100).default(3.7),
  bpjsJpPercent:                 z.coerce.number().min(0).max(100).default(1),
  bpjsJpEmployerPercent:         z.coerce.number().min(0).max(100).default(2),
  bpjsKesehatanEmployeePercent:  z.coerce.number().min(0).max(100).default(1),
  bpjsKesehatanEmployerPercent:  z.coerce.number().min(0).max(100).default(4),
  effectiveDate:                 z.string().min(1, "Tanggal berlaku wajib diisi"),
  endDate:                       z.string().optional().or(z.literal("")),
  isActive:                      z.boolean().default(true),
  notes:                         z.string().optional().or(z.literal("")),
});

export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;
export type SalarySettingFormValues  = z.infer<typeof salarySettingSchema>;
export type UpdateEmployeeFormInput  = z.input<typeof updateEmployeeSchema>;
export type SalarySettingFormInput   = z.input<typeof salarySettingSchema>;
