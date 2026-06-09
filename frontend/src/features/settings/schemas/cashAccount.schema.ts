import { z } from "zod";

// code is set by Accurate sync — not editable
export const cashAccountSchema = z.object({
  name:              z.string().min(1, "Name is required"),
  accurateAccountId: z.coerce.number().optional().or(z.literal("")),
  accurateAccountNo: z.string().optional().or(z.literal("")),
});

export type CashAccountFormValues = z.infer<typeof cashAccountSchema>;
