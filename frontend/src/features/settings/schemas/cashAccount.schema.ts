import { z } from "zod";

export const cashAccountSchema = z.object({
  code:              z.string().min(1, "Kode wajib diisi"),
  name:              z.string().min(1, "Nama wajib diisi"),
  accurateAccountId: z.coerce.number().optional().or(z.literal("")),
  accurateAccountNo: z.string().optional().or(z.literal("")),
});

export type CashAccountFormValues = z.infer<typeof cashAccountSchema>;
