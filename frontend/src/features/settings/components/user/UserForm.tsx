import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createUserSchema, updateUserSchema, resetPasswordSchema,
  type CreateUserFormValues, type UpdateUserFormValues, type ResetPasswordFormValues,
} from "../../schemas/user.schema";
import { useUserRoles, useUsers } from "../../hooks";
import { fetchEmployees } from "../../api/employee.api";
import type { Employee, User } from "../../types";

// ── Create/Edit User Form ─────────────────────────────────────────────
interface UserFormProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: CreateUserFormValues | UpdateUserFormValues) => void;
  isPending:     boolean;
  defaultValues?: User | null;
  error?:        string | null;
}

export function UserForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: UserFormProps) {
  const isEdit = Boolean(defaultValues);
  const { data: userRoles = [] } = useUserRoles();

  // Build a set of employeeIds that already have a user account
  const { data: allUsersData } = useUsers({ limit: 500 });
  const takenEmployeeIds = useMemo(
    () => new Set((allUsersData?.data ?? []).map((u) => u.employeeId).filter(Boolean)),
    [allUsersData]
  );

  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

  // Employee search state (create mode only)
  const [empSearch, setEmpSearch]       = useState("");
  const [empResults, setEmpResults]     = useState<Employee[]>([]);
  const [empSelected, setEmpSelected]   = useState<Employee | null>(null);
  const [empDropOpen, setEmpDropOpen]   = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { employeeId: "", username: "", email: "", password: "", userRoleId: "" },
  });
  const editForm = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { username: defaultValues?.username ?? "", email: defaultValues?.email ?? "", userRoleId: defaultValues?.role?.id ?? "" },
  });

  const activeForm = isEdit ? editForm : createForm;

  useEffect(() => {
    if (open) {
      if (isEdit && defaultValues) {
        editForm.reset({ username: defaultValues.username ?? "", email: defaultValues.email, userRoleId: defaultValues.role.id });
      } else {
        createForm.reset({ employeeId: "", username: "", email: "", password: "", userRoleId: "" });
        setEmpSearch(""); setEmpSelected(null); setEmpResults([]);
        setShowPassword(false);
      }
    }
  }, [open, defaultValues, isEdit]);

  function handleEmpSearch(value: string) {
    setEmpSearch(value);
    setEmpDropOpen(true);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      if (!value.trim()) { setEmpResults([]); return; }
      const result = await fetchEmployees({ search: value, limit: 20 });
      const available = (result.data ?? []).filter((emp) => !takenEmployeeIds.has(emp.id));
      setEmpResults(available);
    }, 350);
  }

  function selectEmployee(emp: Employee) {
    setEmpSelected(emp);
    setEmpSearch(emp.name);
    setEmpDropOpen(false);
    createForm.setValue("employeeId", emp.id);
  }

  const { errors: createErrors } = createForm.formState;
  const { errors: editErrors }   = editForm.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-md sm:max-h-[90dvh]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>{isEdit ? "Edit User Account" : "New User Account"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={activeForm.handleSubmit(onSubmit as never)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-4">
              {/* Employee select — create mode only */}
              {!isEdit && (
                <div className="space-y-1.5 relative">
                  <Label>Employee <span className="text-destructive">*</span></Label>
                  <Input
                    value={empSearch}
                    onChange={(e) => handleEmpSearch(e.target.value)}
                    onFocus={() => empSearch && setEmpDropOpen(true)}
                    placeholder="Search employee name…"
                    autoComplete="off"
                  />
                  {empDropOpen && empSearch.trim() && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md max-h-48 overflow-y-auto">
                      {empResults.length > 0 ? (
                        empResults.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                            onClick={() => selectEmployee(emp)}
                          >
                            <span className="font-medium">{emp.name}</span>
                            {emp.employeeCode && (
                              <span className="ml-2 text-xs text-muted-foreground">{emp.employeeCode}</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No employees without an account found.
                        </p>
                      )}
                    </div>
                  )}
                  <input type="hidden" {...createForm.register("employeeId")} />
                  {createErrors.employeeId && (
                    <p className="text-xs text-destructive">{createErrors.employeeId.message}</p>
                  )}
                  {empSelected && (
                    <p className="text-xs text-muted-foreground">Selected: {empSelected.name}</p>
                  )}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <Label>Username <span className="text-destructive">*</span></Label>
                {isEdit
                  ? <Input type="text" {...editForm.register("username")} placeholder="contoh: admin_nia" autoComplete="off" />
                  : <Input type="text" {...createForm.register("username")} placeholder="contoh: admin_nia" autoComplete="off" />
                }
                {(isEdit ? editErrors.username : createErrors.username) && (
                  <p className="text-xs text-destructive">
                    {(isEdit ? editErrors.username : createErrors.username)?.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                {isEdit
                  ? <Input type="email" {...editForm.register("email")} placeholder="email@example.com" />
                  : <Input type="email" {...createForm.register("email")} placeholder="email@example.com" />
                }
                {(isEdit ? editErrors.email : createErrors.email) && (
                  <p className="text-xs text-destructive">
                    {(isEdit ? editErrors.email : createErrors.email)?.message}
                  </p>
                )}
              </div>

              {/* Password — create mode only */}
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label>Password <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...createForm.register("password")}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye    className="h-4 w-4" />
                      }
                    </button>
                  </div>
                  {createErrors.password && (
                    <p className="text-xs text-destructive">{createErrors.password.message}</p>
                  )}
                </div>
              )}

              {/* User Role */}
              <div className="space-y-1.5">
                <Label>User Role <span className="text-destructive">*</span></Label>
                <select
                  {...(isEdit ? editForm.register("userRoleId") : createForm.register("userRoleId"))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Select role —</option>
                  {userRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {(isEdit ? editErrors.userRoleId : createErrors.userRoleId) && (
                  <p className="text-xs text-destructive">
                    {(isEdit ? editErrors.userRoleId : createErrors.userRoleId)?.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Reset Password Dialog ─────────────────────────────────────────────
interface ResetPwProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit:     (values: ResetPasswordFormValues) => void;
  isPending:    boolean;
  error?:       string | null;
}

export function ResetPasswordDialog({ open, onOpenChange, onSubmit, isPending, error }: ResetPwProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    if (open) reset({ password: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}
          <div className="space-y-1.5">
            <Label>New Password <span className="text-destructive">*</span></Label>
            <Input type="password" {...register("password")} placeholder="Min 6 characters" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Reset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
