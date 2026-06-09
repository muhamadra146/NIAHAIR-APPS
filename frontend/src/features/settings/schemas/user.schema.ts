import { z } from "zod";

export const createUserSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  email:      z.string().email("Invalid email"),
  password:   z.string().min(6, "Password must be at least 6 characters"),
  userRoleId: z.string().min(1, "Role is required"),
});

export const updateUserSchema = z.object({
  email:      z.string().email("Invalid email").optional().or(z.literal("")),
  userRoleId: z.string().min(1, "Role is required"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateUserFormValues  = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues  = z.infer<typeof updateUserSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
