import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from "../../hooks";
import type { Holiday } from "../../types";

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

interface FormState { date: string; name: string }
const EMPTY: FormState = { date: "", name: "" };

function toForm(h: Holiday): FormState {
  return { date: h.date.split("T")[0], name: h.name };
}

export function HolidayTab() {
  const [year,       setYear]       = useState<number>(currentYear);
  const [formOpen,   setFormOpen]   = useState(false);
  const [editItem,   setEditItem]   = useState<Holiday | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [error,      setError]      = useState<string | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const { data: holidays = [], isLoading } = useHolidays(year);
  const createMut = useCreateHoliday();
  const updateMut = useUpdateHoliday(editItem?.id ?? "");
  const deleteMut = useDeleteHoliday();
  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(h: Holiday) {
    setEditItem(h);
    setForm(toForm(h));
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    if (!form.date || !form.name.trim()) {
      setError("Tanggal dan nama wajib diisi");
      return;
    }
    try {
      if (editItem) {
        await updateMut.mutateAsync({ date: form.date, name: form.name.trim() });
      } else {
        await createMut.mutateAsync({ date: form.date, name: form.name.trim() });
      }
      setFormOpen(false);
    } catch (err) { setError(apiErr(err)); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (err) { setError(apiErr(err)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Hari Libur Nasional</h2>
          <p className="text-sm text-muted-foreground">
            Daftar hari libur untuk perhitungan rate kerja hari libur pada penggajian
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Hari Libur
        </Button>
      </div>

      {/* Year filter */}
      <div className="flex gap-2">
        {YEARS.map((y) => (
          <Button
            key={y}
            size="sm"
            variant={y === year ? "default" : "outline"}
            onClick={() => setYear(y)}
          >
            {y}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/70">
              {["Tanggal", "Nama Hari Libur", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Belum ada hari libur untuk tahun {year}</td></tr>
            ) : holidays
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-sm">{fmtDate(h.date)}</td>
                    <td className="px-4 py-3 font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(h.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Hari Libur" : "Tambah Hari Libur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Hari Libur</Label>
              <Input
                placeholder="cth: Hari Raya Idul Fitri"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.date || !form.name.trim()}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Hari Libur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus hari libur ini?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
