import { z } from "zod";

export const paymentMethodSchema = z.object({
  code:          z.string().min(1, "Code is required"),
  name:          z.string().min(1, "Name is required"),
  cashAccountId: z.string().optional().or(z.literal("")),
});

export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>;
