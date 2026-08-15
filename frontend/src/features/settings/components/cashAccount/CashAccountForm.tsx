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
import { cashAccountSchema, type CashAccountFormValues } from "../../schemas/cashAccount.schema";
import type { CashAccount } from "../../types";

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit:     (values: CashAccountFormValues) => void;
  isPending:    boolean;
  defaultValues?: CashAccount | null;
  error?:       string | null;
}

export function CashAccountForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: Props) {
  const isEdit = Boolean(defaultValues);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CashAccountFormValues>({
    resolver: zodResolver(cashAccountSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        code:              defaultValues?.code ?? "",
        name:              defaultValues?.name ?? "",
        accurateAccountId: defaultValues?.accurateAccountId ?? "",
        accurateAccountNo: defaultValues?.accurateAccountNo ?? "",
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
          <DialogTitle>{isEdit ? "Edit Cash Account" : "Tambah Cash Account"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Kode <span className="text-destructive">*</span></Label>
                {isEdit ? (
                  <>
                    <Input value={defaultValues?.code ?? ""} readOnly disabled className="bg-muted text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Kode tidak dapat diubah.</p>
                  </>
                ) : (
                  <>
                    <Input {...register("code")} placeholder="KAS-001" />
                    {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Nama <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="Kas Cipete" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Accurate Account ID</Label>
                  <Input {...register("accurateAccountId")} inputMode="numeric" placeholder="12345" />
                </div>
                <div className="space-y-1.5">
                  <Label>Accurate Account No</Label>
                  <Input {...register("accurateAccountNo")} placeholder="1-110001" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
