import { z } from "zod";

// CRM-005: Indonesian phone format (08xx or 628xx)
const phoneRegex = /^(08|628)\d{7,12}$/;

export const customerSchema = z.object({
  name:        z.string().min(1, "Nama wajib diisi"),
  mobilePhone: z.string()
    .min(1, "Nomor HP wajib diisi")
    .regex(phoneRegex, "Format tidak valid. Gunakan 08xx atau 628xx"),
  email:       z.string().email("Format email tidak valid").optional().or(z.literal("")),
  gender:      z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  birthDate:   z.string().optional().or(z.literal("")),
  address:     z.string().optional().or(z.literal("")),
  city:        z.string().optional().or(z.literal("")),
  province:    z.string().optional().or(z.literal("")),
  notes:       z.string().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
