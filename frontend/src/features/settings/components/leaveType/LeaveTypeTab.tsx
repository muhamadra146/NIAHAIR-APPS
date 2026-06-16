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
import type { LeaveType, CreateLeaveTypeInput, UpdateLeaveTypeInput } from "../../types";

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

interface FormState {
  code:           string;
  name:           string;
  maxDaysPerYear: string;
  isPaid:         boolean;
  isActive:       boolean;
}

const EMPTY: FormState = { code: "", name: "", maxDaysPerYear: "12", isPaid: true, isActive: true };

function toForm(lt: LeaveType): FormState {
  return {
    code:           lt.code,
    name:           lt.name,
    maxDaysPerYear: String(lt.maxDaysPerYear),
    isPaid:         lt.isPaid,
    isActive:       lt.isActive,
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
          name:           form.name,
          maxDaysPerYear: Number(form.maxDaysPerYear),
          isPaid:         form.isPaid,
          isActive:       form.isActive,
        };
        await updateMut.mutateAsync(input);
      } else {
        const input: CreateLeaveTypeInput = {
          code:           form.code,
          name:           form.name,
          maxDaysPerYear: Number(form.maxDaysPerYear),
          isPaid:         form.isPaid,
        };
        await createMut.mutateAsync(input);
      }
      setFormOpen(false);
    } catch (err) { setError(apiErr(err)); }
  }

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
              {["Kode", "Nama", "Maks. Hari/Tahun", "Berbayar", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : leaveTypes.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada tipe cuti</td></tr>
            ) : leaveTypes.map((lt) => (
              <tr key={lt.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-sm">{lt.code}</td>
                <td className="px-4 py-3 font-medium">{lt.name}</td>
                <td className="px-4 py-3 text-center">{lt.maxDaysPerYear}</td>
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
              <Label>Maksimal Hari per Tahun</Label>
              <Input
                type="number"
                min={1}
                value={form.maxDaysPerYear}
                onChange={(e) => setForm((f) => ({ ...f, maxDaysPerYear: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Cuti Berbayar</Label>
              <Switch
                checked={form.isPaid}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPaid: v }))}
              />
            </div>
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
