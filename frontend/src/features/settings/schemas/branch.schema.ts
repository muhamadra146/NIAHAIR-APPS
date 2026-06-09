import { z } from "zod";

export const branchSchema = z.object({
  code:     z.string().min(1, "Code is required"),
  name:     z.string().min(1, "Name is required"),
  address:  z.string().optional().or(z.literal("")),
  city:     z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  phone:    z.string().optional().or(z.literal("")),
});

export type BranchFormValues = z.infer<typeof branchSchema>;
