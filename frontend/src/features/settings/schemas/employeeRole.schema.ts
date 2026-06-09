import { z } from "zod";

export const employeeRoleSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
});

export type EmployeeRoleFormValues = z.infer<typeof employeeRoleSchema>;
