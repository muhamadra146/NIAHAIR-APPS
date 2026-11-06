import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MANUAL_ITEM_TYPES } from "../types";
import type { ManualItemCategory, ManualItemInput, PayrollItem } from "../types";

// Item gaji manual (PAY-038): THR, bonus/insentif, rapel, koreksi kelebihan bayar, potongan lainnya.
// Nominal diketik manual; keterangan wajib.

interface Props {
  open:      boolean;
  /** Item yang diubah; kosong = tambah baru */
  item?:     PayrollItem | null;
  isPending: boolean;
  onClose:   () => void;
  onSubmit:  (input: ManualItemInput) => Promise<boolean>;
}

export function ManualItemDialog({ open, item, isPending, onClose, onSubmit }: Props) {
  // Dialog dipasang ulang per item (key di pemanggil) — nilai awal dari item yang diubah
  const [category, setCategory] = useState<ManualItemCategory | "">((item?.category as ManualItemCategory) ?? "");
  const [amount,   setAmount]   = useState(item ? String(Number(item.amount)) : "");
  const [notes,    setNotes]    = useState(item?.notes ?? "");
  const [error,    setError]    = useState<string | null>(null);

  const def = MANUAL_ITEM_TYPES.find((t) => t.value === category);

  const submit = async () => {
    const value = Number(amount);
    if (!category) return setError("Pilih jenis item");
    if (!amount || !Number.isFinite(value) || value <= 0) return setError("Nominal harus lebih dari 0");
    if (notes.trim().length < 3) return setError("Keterangan wajib diisi (minimal 3 karakter)");
    setError(null);
    const ok = await onSubmit({ category, amount: value, notes: notes.trim() });
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah Item Manual" : "Tambah Item Manual"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Jenis <span className="text-destructive">*</span></Label>
            <select
              value={category}
              disabled={!!item}
              onChange={(e) => setCategory(e.target.value as ManualItemCategory)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="">— Pilih jenis —</option>
              <optgroup label="Penghasilan">
                {MANUAL_ITEM_TYPES.filter((t) => t.type === "INCOME").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </optgroup>
              <optgroup label="Potongan">
                {MANUAL_ITEM_TYPES.filter((t) => t.type === "DEDUCTION").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </optgroup>
            </select>
            {def && <p className="text-xs text-muted-foreground">{def.hint}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nominal (Rp) <span className="text-destructive">*</span></Label>
            <Input type="number" min={1} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="cth: 6000000" />
            {Number(amount) > 0 && <p className="text-xs text-muted-foreground">Rp {new Intl.NumberFormat("id-ID").format(Number(amount))}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Keterangan <span className="text-destructive">*</span></Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="cth: THR Idul Fitri 2027 / rapel tunjangan Maret / koreksi kelebihan transport Januari"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">Payroll dihitung ulang otomatis (total & PPh 21) setelah disimpan.</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button size="sm" onClick={submit} disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
