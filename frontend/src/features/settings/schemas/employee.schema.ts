import { z } from "zod";

export const employeeSchema = z.object({
  name:         z.string().min(1, "Nama wajib diisi"),
  roleId:       z.string().min(1, "Role wajib dipilih"),
  employeeCode: z.string().optional().or(z.literal("")),
  phone:        z.string().optional().or(z.literal("")),
  email:        z.string().email("Format email tidak valid").optional().or(z.literal("")),
  homeBranchId: z.string().optional().or(z.literal("")),
  branchIds:    z.array(z.string()).optional().default([]),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
export type EmployeeFormInput = z.input<typeof employeeSchema>;
