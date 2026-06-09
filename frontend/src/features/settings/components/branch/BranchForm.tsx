import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { branchSchema, type BranchFormValues } from "../../schemas/branch.schema";
import type { Branch } from "../../types";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: BranchFormValues) => void;
  isPending:     boolean;
  defaultValues?: Branch | null;
  error?:        string | null;
}

export function BranchForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      code:     defaultValues?.code ?? "",
      name:     defaultValues?.name ?? "",
      address:  defaultValues?.address ?? "",
      city:     defaultValues?.city ?? "",
      province: defaultValues?.province ?? "",
      phone:    defaultValues?.phone ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        code:     defaultValues?.code ?? "",
        name:     defaultValues?.name ?? "",
        address:  defaultValues?.address ?? "",
        city:     defaultValues?.city ?? "",
        province: defaultValues?.province ?? "",
        phone:    defaultValues?.phone ?? "",
      });
    }
  }, [open, defaultValues, reset]);

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
          <DialogTitle>{defaultValues ? "Edit Branch" : "New Branch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input {...register("code")} placeholder="JKT-01" />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="NIAHAIR Cipete" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input {...register("address")} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input {...register("city")} placeholder="Jakarta" />
              </div>
              <div className="space-y-1.5">
                <Label>Province</Label>
                <Input {...register("province")} placeholder="DKI Jakarta" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="02112345678" inputMode="tel" />
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
