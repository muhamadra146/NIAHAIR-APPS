import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;

export const shiftSchema = z.object({
  code:      z.string().min(1, "Kode wajib diisi").max(10, "Maksimal 10 karakter"),
  name:      z.string().min(1, "Nama wajib diisi"),
  startTime: z.string().regex(timeRegex, "Format JJ:MM (mis. 09:00)").optional().or(z.literal("")),
  endTime:   z.string().regex(timeRegex, "Format JJ:MM (mis. 18:00)").optional().or(z.literal("")),
  color:     z.string().optional().or(z.literal("")),
  isWorking: z.boolean().default(true),
  isActive:  z.boolean().optional(),
});

export type ShiftFormValues = z.infer<typeof shiftSchema>;
export type ShiftFormInput = z.input<typeof shiftSchema>;
