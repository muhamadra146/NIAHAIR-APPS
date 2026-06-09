import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const serviceLineSchema = z.object({
  itemId:      z.string().min(1),
  serviceName: z.string(),
  serviceCode: z.string(),
  qty:         z.coerce.number().min(1, "Min 1"),
  price:       z.coerce.number().min(0, "Min 0"),
});

export const createAppointmentSchema = z.object({
  customerId:     z.string().min(1, "Customer is required"),
  visitDate:      z.string().min(1, "Visit date is required"),
  startTime:      z.string().regex(timeRegex, "Enter time as HH:MM (e.g. 09:00)"),
  endTime:        z.string().regex(timeRegex, "Enter time as HH:MM (e.g. 12:00)"),
  notes:          z.string().optional().or(z.literal("")),
  estimatedTotal: z.coerce.number().min(0).optional(),
  services:       z.array(serviceLineSchema).optional(),
});

export const updateAppointmentSchema = z.object({
  visitDate:      z.string().optional().or(z.literal("")),
  startTime:      z.string().regex(timeRegex, "Enter time as HH:MM").optional().or(z.literal("")),
  endTime:        z.string().regex(timeRegex, "Enter time as HH:MM").optional().or(z.literal("")),
  notes:          z.string().optional().or(z.literal("")),
  estimatedTotal: z.coerce.number().min(0).optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum([
    "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS",
    "COMPLETED", "CANCELLED", "NO_SHOW",
  ]),
  notes: z.string().optional().or(z.literal("")),
});

export type ServiceLineFormValues       = z.infer<typeof serviceLineSchema>;
export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentFormValues = z.infer<typeof updateAppointmentSchema>;
export type ChangeStatusFormValues      = z.infer<typeof changeStatusSchema>;
