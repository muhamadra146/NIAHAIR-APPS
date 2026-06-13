import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;

export const shiftSchema = z.object({
  code:      z.string().min(1, "Code is required").max(10, "Max 10 characters"),
  name:      z.string().min(1, "Name is required"),
  startTime: z.string().regex(timeRegex, "Format HH:MM (e.g. 09:00)").optional().or(z.literal("")),
  endTime:   z.string().regex(timeRegex, "Format HH:MM (e.g. 18:00)").optional().or(z.literal("")),
  color:     z.string().optional().or(z.literal("")),
  isWorking: z.boolean().default(true),
  isActive:  z.boolean().optional(),
});

export type ShiftFormValues = z.infer<typeof shiftSchema>;
