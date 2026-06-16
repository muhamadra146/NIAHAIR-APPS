import { useState } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType } from "../../hooks";
import type { LeaveType, CreateLeaveTypeInput, UpdateLeaveTypeInput, QuotaType } from "../../types";

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

const QUOTA_LABELS: Record<QuotaType, string> = {
  ANNUAL:      "Tahunan",
  EVENT_BASED: "Per Kejadian",
  LIFETIME:    "Seumur Hidup",
};

const QUOTA_BADGE_COLORS: Record<QuotaType, string> = {
  ANNUAL:      "bg-blue-100 text-blue-700 border-blue-200",
  EVENT_BASED: "bg-amber-100 text-amber-700 border-amber-200",
  LIFETIME:    "bg-purple-100 text-purple-700 border-purple-200",
};

interface FormState {
  code:               string;
  name:               string;
  quotaType:          QuotaType;
  maxDaysPerYear:     string;
  isPaid:             boolean;
  unusedDayPayoutRate: string;
  isActive:           boolean;
}

const EMPTY: FormState = {
  code: "", name: "", quotaType: "ANNUAL", maxDaysPerYear: "12",
  isPaid: true, unusedDayPayoutRate: "0", isActive: true,
};

function toForm(lt: LeaveType): FormState {
  return {
    code:               lt.code,
    name:               lt.name,
    quotaType:          lt.quotaType,
    maxDaysPerYear:     String(lt.maxDaysPerYear),
    isPaid:             lt.isPaid,
    unusedDayPayoutRate: String(lt.unusedDayPayoutRate ?? 0),
    isActive:           lt.isActive,
  };
}

export function LeaveTypeTab() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<LeaveType | null>(null);
  const [form,     setForm    ] = useState<FormState>(EMPTY);
  const [error,    setError   ] = useState<string | null>(null);

  const { data: leaveTypes = [], isLoading } = useLeaveTypes(includeInactive);
  const createMut = useCreateLeaveType();
  const updateMut = useUpdateLeaveType(editItem?.id ?? "");

  const isPending = createMut.isPending || updateMut.isPending;

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(lt: LeaveType) {
    setEditItem(lt);
    setForm(toForm(lt));
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    try {
      if (editItem) {
        const input: UpdateLeaveTypeInput = {
          name:               form.name,
          quotaType:          form.quotaType,
          maxDaysPerYear:     Number(form.maxDaysPerYear),
          isPaid:             form.isPaid,
          unusedDayPayoutRate: Number(form.unusedDayPayoutRate),
          isActive:           form.isActive,
        };
        await updateMut.mutateAsync(input);
      } else {
        const input: CreateLeaveTypeInput = {
          code:               form.code,
          name:               form.name,
          quotaType:          form.quotaType,
          maxDaysPerYear:     Number(form.maxDaysPerYear),
          isPaid:             form.isPaid,
          unusedDayPayoutRate: Number(form.unusedDayPayoutRate),
        };
        await createMut.mutateAsync(input);
      }
      setFormOpen(false);
    } catch (err) { setError(apiErr(err)); }
  }

  const isAnnual = form.quotaType === "ANNUAL";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Tipe Cuti</h2>
          <p className="text-sm text-muted-foreground">Kelola jenis-jenis cuti karyawan</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
            Tampilkan nonaktif
          </label>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Tipe
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/70">
              {["Kode", "Nama", "Jenis Kuota", "Maks. Hari/Tahun", "Payout Sisa", "Berbayar", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : leaveTypes.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada tipe cuti</td></tr>
            ) : leaveTypes.map((lt) => (
              <tr key={lt.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-sm">{lt.code}</td>
                <td className="px-4 py-3 font-medium">{lt.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${QUOTA_BADGE_COLORS[lt.quotaType]}`}>
                    {QUOTA_LABELS[lt.quotaType]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  {lt.quotaType === "ANNUAL" ? lt.maxDaysPerYear : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-center text-xs">
                  {lt.quotaType === "ANNUAL" && Number(lt.unusedDayPayoutRate) > 0
                    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(lt.unusedDayPayoutRate))
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {lt.isPaid ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <X className="h-4 w-4 text-slate-400 mx-auto" />}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={lt.isActive ? "default" : "secondary"}>
                    {lt.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(lt)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Tipe Cuti" : "Tambah Tipe Cuti"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editItem && (
              <div className="space-y-1.5">
                <Label>Kode</Label>
                <Input
                  placeholder="cth: TAHUNAN"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                placeholder="cth: Cuti Tahunan"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Jenis Kuota</Label>
              <select
                value={form.quotaType}
                onChange={(e) => setForm((f) => ({ ...f, quotaType: e.target.value as QuotaType }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="ANNUAL">Tahunan — reset tiap tahun, kuota dilacak</option>
                <option value="EVENT_BASED">Per Kejadian — Nikah, Umroh, Melahirkan, dll.</option>
                <option value="LIFETIME">Seumur Hidup — Haji, hanya 1× seumur hidup</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {form.quotaType === "ANNUAL" && "Kuota dikurangi saat cuti disetujui."}
                {form.quotaType === "EVENT_BASED" && "Tidak memotong kuota tahunan."}
                {form.quotaType === "LIFETIME" && "Tidak memotong kuota tahunan."}
              </p>
            </div>

            {isAnnual && (
              <div className="space-y-1.5">
                <Label>Maksimal Hari per Tahun</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxDaysPerYear}
                  onChange={(e) => setForm((f) => ({ ...f, maxDaysPerYear: e.target.value }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Cuti Berbayar</Label>
              <Switch
                checked={form.isPaid}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPaid: v }))}
              />
            </div>

            {isAnnual && (
              <div className="space-y-1.5">
                <Label>Payout Cuti Sisa / Hari (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="cth: 100000"
                  value={form.unusedDayPayoutRate}
                  onChange={(e) => setForm((f) => ({ ...f, unusedDayPayoutRate: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Jika &gt; 0, sisa hari cuti akhir tahun akan dibayar ke karyawan (masuk payroll Desember).
                </p>
              </div>
            )}

            {editItem && (
              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
