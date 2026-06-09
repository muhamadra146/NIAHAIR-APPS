import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employeeRoleSchema, type EmployeeRoleFormValues } from "../../schemas/employeeRole.schema";
import type { EmployeeRole } from "../../types";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: EmployeeRoleFormValues) => void;
  isPending:     boolean;
  defaultValues?: EmployeeRole | null;
  error?:        string | null;
}

export function EmployeeRoleForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeRoleFormValues>({
    resolver: zodResolver(employeeRoleSchema),
    defaultValues: { code: defaultValues?.code ?? "", name: defaultValues?.name ?? "" },
  });

  useEffect(() => {
    if (open) reset({ code: defaultValues?.code ?? "", name: defaultValues?.name ?? "" });
  }, [open, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Role" : "New Role"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="role-code">Code <span className="text-destructive">*</span></Label>
            <Input id="role-code" {...register("code")} placeholder="STYLIST" />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-name">Name <span className="text-destructive">*</span></Label>
            <Input id="role-name" {...register("name")} placeholder="Stylist" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
