import type { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Dialog konfirmasi sederhana (dipakai untuk "Batalkan" pengajuan cuti / izin / sakit) */
export function ConfirmDialog({
  open, title, description, confirmLabel = "Ya, Batalkan", cancelLabel = "Tidak",
  isPending = false, onConfirm, onClose,
}: {
  open:          boolean;
  title:         string;
  description?:  ReactNode;
  confirmLabel?: string;
  cancelLabel?:  string;
  isPending?:    boolean;
  onConfirm:     () => void;
  onClose:       () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isPending) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="text-sm">{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>{cancelLabel}</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Memproses…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
