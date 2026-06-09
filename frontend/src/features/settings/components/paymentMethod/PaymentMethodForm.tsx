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
import { paymentMethodSchema, type PaymentMethodFormValues } from "../../schemas/paymentMethod.schema";
import { useAllCashAccounts } from "../../hooks";
import type { PaymentMethod } from "../../types";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: PaymentMethodFormValues) => void;
  isPending:     boolean;
  defaultValues?: PaymentMethod | null;
  error?:        string | null;
}

export function PaymentMethodForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: Props) {
  const { data: cashAccounts = [] } = useAllCashAccounts();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      code:          defaultValues?.code ?? "",
      name:          defaultValues?.name ?? "",
      cashAccountId: defaultValues?.cashAccountId ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        code:          defaultValues?.code ?? "",
        name:          defaultValues?.name ?? "",
        cashAccountId: defaultValues?.cashAccountId ?? "",
      });
    }
  }, [open, defaultValues, reset]);

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
          <DialogTitle>{defaultValues ? "Edit Payment Method" : "New Payment Method"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input {...register("code")} placeholder="CASH" />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="Cash" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Cash Account</Label>
                <select
                  {...register("cashAccountId")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— None —</option>
                  {cashAccounts.map((ca) => (
                    <option key={ca.id} value={ca.id}>{ca.name} ({ca.code})</option>
                  ))}
                </select>
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
