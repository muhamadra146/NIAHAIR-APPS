import { z } from "zod";

export const scheduleSchema = z.object({
  employeeId:   z.string().min(1, "Employee is required"),
  scheduleDate: z.string().min(1, "Date is required"),
  scheduleType: z.enum(["WORK", "OFF", "LEAVE"]),
  startTime:    z.string().optional(),
  endTime:      z.string().optional(),
  notes:        z.string().optional(),
});

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;
