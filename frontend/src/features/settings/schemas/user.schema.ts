import { z } from "zod";

export const createUserSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  username:   z.string().min(3, "Username minimal 3 karakter"),
  email:      z.string().email("Format email tidak valid"),
  password:   z.string().min(6, "Password minimal 6 karakter"),
  userRoleId: z.string().min(1, "Role wajib dipilih"),
});

export const updateUserSchema = z.object({
  username:   z.string().min(3, "Username minimal 3 karakter").optional().or(z.literal("")),
  email:      z.string().email("Format email tidak valid").optional().or(z.literal("")),
  userRoleId: z.string().min(1, "Role wajib dipilih"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type CreateUserFormValues  = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues  = z.infer<typeof updateUserSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
