import { z } from "zod";

export const paymentMethodSchema = z.object({
  code:          z.string().min(1, "Kode wajib diisi"),
  name:          z.string().min(1, "Nama wajib diisi"),
  cashAccountId: z.string().optional().or(z.literal("")),
});

export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>;
