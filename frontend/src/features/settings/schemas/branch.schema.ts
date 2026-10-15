import { z } from "zod";

export const branchSchema = z.object({
  code:         z.string().min(1, "Kode wajib diisi"),
  name:         z.string().min(1, "Nama wajib diisi"),
  address:      z.string().optional().or(z.literal("")),
  city:         z.string().optional().or(z.literal("")),
  province:     z.string().optional().or(z.literal("")),
  phone:        z.string().optional().or(z.literal("")),
  latitude:     z.string().optional().or(z.literal("")),
  longitude:    z.string().optional().or(z.literal("")),
  radiusMeters: z.string().optional().or(z.literal("")),
});

export type BranchFormValues = z.infer<typeof branchSchema>;
