import { z } from "zod";

export const employeeRoleSchema = z.object({
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
});

export type EmployeeRoleFormValues = z.infer<typeof employeeRoleSchema>;
