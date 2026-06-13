import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { employeeSchema, type EmployeeFormValues } from "../../schemas/employee.schema";
import { useAllEmployeeRoles, useAllBranches } from "../../hooks";
import type { Employee } from "../../types";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: EmployeeFormValues) => void;
  isPending:     boolean;
  defaultValues?: Employee | null;
  error?:        string | null;
  nextCode?:     string;
}

export function EmployeeForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error, nextCode }: Props) {
  const { data: rolesData }     = useAllEmployeeRoles();
  const { data: branches = [] } = useAllBranches();

  const roles = rolesData?.data ?? [];

  const existingBranchIds = defaultValues?.employeeBranches?.map((eb) => eb.branch.id) ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name:         defaultValues?.name ?? "",
      roleId:       defaultValues?.roleId ?? "",
      employeeCode: defaultValues?.employeeCode ?? "",
      phone:        defaultValues?.phone ?? "",
      email:        defaultValues?.email ?? "",
      homeBranchId: defaultValues?.homeBranchId ?? "",
      branchIds:    existingBranchIds,
    },
  });

  useEffect(() => {
    if (open) {
      const bIds = defaultValues?.employeeBranches?.map((eb) => eb.branch.id) ?? [];
      reset({
        name:         defaultValues?.name ?? "",
        roleId:       defaultValues?.roleId ?? "",
        employeeCode: defaultValues ? (defaultValues.employeeCode ?? "") : (nextCode ?? ""),
        phone:        defaultValues?.phone ?? "",
        email:        defaultValues?.email ?? "",
        homeBranchId: defaultValues?.homeBranchId ?? "",
        branchIds:    bIds,
      });
    }
  }, [open, defaultValues, nextCode, reset]);

  const selectedBranchIds = watch("branchIds") ?? [];
  const homeBranchId      = watch("homeBranchId") ?? "";

  const homeBranchNotInAccess =
    homeBranchId !== "" &&
    selectedBranchIds.length > 0 &&
    !selectedBranchIds.includes(homeBranchId);

  function toggleBranch(branchId: string) {
    const next = selectedBranchIds.includes(branchId)
      ? selectedBranchIds.filter((id) => id !== branchId)
      : [...selectedBranchIds, branchId];
    setValue("branchIds", next);
  }

  const title = defaultValues ? "Edit Employee" : "New Employee";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="emp-name">Name <span className="text-destructive">*</span></Label>
                <Input id="emp-name" {...register("name")} placeholder="Full name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Employee Code — auto-generated, read-only */}
              <div className="space-y-1.5">
                <Label htmlFor="emp-code">Employee Code</Label>
                <Input
                  id="emp-code"
                  {...register("employeeCode")}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Auto-generated. Cannot be changed.</p>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input id="emp-phone" {...register("phone")} placeholder="08123456789" inputMode="tel" />
              </div>

              {/* Email */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="emp-email">Email</Label>
                <Input id="emp-email" type="email" {...register("email")} placeholder="email@example.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Employee Role */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="emp-role">Employee Role <span className="text-destructive">*</span></Label>
                <select
                  id="emp-role"
                  {...register("roleId")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Select role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {errors.roleId && <p className="text-xs text-destructive">{errors.roleId.message}</p>}
              </div>

              {/* Home Branch */}
              {branches.length > 0 && (
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="emp-home-branch">Home Branch</Label>
                  <select
                    id="emp-home-branch"
                    {...register("homeBranchId")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— None —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Employee's origin branch for payroll and cost allocation.
                  </p>
                  {homeBranchNotInAccess && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Home branch is not included in branch access. Add it below if needed.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Branch Access */}
              {branches.length > 0 && (
                <div className="sm:col-span-2 space-y-2">
                  <Label>Can Work At</Label>
                  <div className="rounded-md border border-input p-3 space-y-2">
                    {branches.map((branch) => {
                      const checked = selectedBranchIds.includes(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className="flex cursor-pointer items-center gap-3 rounded-sm px-1 py-0.5 hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBranch(branch.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-sm">{branch.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{branch.code}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
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
