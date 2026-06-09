import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAllBranches } from "../../hooks";
import type { Warehouse } from "../../types";

const warehouseFormSchema = z.object({
  branchId:            z.string().optional(),
  accurateWarehouseId: z.string().optional(),
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit:     (values: WarehouseFormValues, original: Warehouse) => void;
  isPending:    boolean;
  warehouse:    Warehouse | null;
  error?:       string | null;
}

export function WarehouseForm({ open, onOpenChange, onSubmit, isPending, warehouse, error }: Props) {
  const { data: branchesData } = useAllBranches();
  const branches = branchesData ?? [];

  const { register, handleSubmit, reset } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
  });

  useEffect(() => {
    if (open && warehouse) {
      reset({
        branchId:            warehouse.branchId ?? "",
        accurateWarehouseId: warehouse.accurateWarehouseId?.toString() ?? "",
      });
    }
  }, [open, warehouse, reset]);

  function handleFormSubmit(values: WarehouseFormValues) {
    if (warehouse) onSubmit(values, warehouse);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-md"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Edit Warehouse Mapping</DialogTitle>
          {warehouse && (
            <p className="text-sm text-muted-foreground">{warehouse.name}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-4">
              {/* Branch mapping */}
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <select
                  {...register("branchId")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Not mapped —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Map this warehouse to a branch for inventory tracking.
                </p>
              </div>

              {/* Accurate mapping */}
              <div className="space-y-1.5">
                <Label>Accurate Warehouse ID</Label>
                <Input
                  {...register("accurateWarehouseId")}
                  inputMode="numeric"
                  placeholder="e.g. 12345"
                />
                <p className="text-xs text-muted-foreground">
                  Integer ID from Accurate Online. Leave blank to keep existing.
                </p>
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
