import { z } from "zod";

export const employeeSchema = z.object({
  name:         z.string().min(1, "Name is required"),
  roleId:       z.string().min(1, "Role is required"),
  employeeCode: z.string().optional().or(z.literal("")),
  phone:        z.string().optional().or(z.literal("")),
  email:        z.string().email("Invalid email").optional().or(z.literal("")),
  branchIds:    z.array(z.string()).optional().default([]),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
