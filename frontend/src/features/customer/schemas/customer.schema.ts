import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobilePhone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
