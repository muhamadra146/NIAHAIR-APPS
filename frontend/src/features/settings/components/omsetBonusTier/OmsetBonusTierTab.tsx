import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Label }       from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useEmployees, useOmsetBonusTiers,
  useCreateOmsetBonusTier, useUpdateOmsetBonusTier, useDeleteOmsetBonusTier,
} from "../../hooks";
import { toast } from "@/lib/toast";
import type { Employee, OmsetBonusTier } from "../../types";

// Minimal employee shape needed when used in embedded mode (pre-selected employee)
export interface EmbeddedEmployee {
  id:           string;
  name:         string;
  role:         { name: string };
  employeeCode?: string | null;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n}%`;

// ── form types ────────────────────────────────────────────────────────────────
interface TierFormValues {
  minimumOmset: string; // string for input, convert to number on submit
  percentage:   string;
  sortOrder:    string;
}

// ── TierDialog ────────────────────────────────────────────────────────────────
function TierDialog({
  open,
  onOpenChange,
  editing,
  employeeId,
  onClose,
}: {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  editing:        OmsetBonusTier | null;
  employeeId:     string;
  onClose:        () => void;
}) {
  const createMut = useCreateOmsetBonusTier(employeeId);
  const updateMut = useUpdateOmsetBonusTier(editing?.id ?? "", employeeId);
  const isPending = createMut.isPending || updateMut.isPending;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TierFormValues>({
    defaultValues: {
      minimumOmset: editing ? String(editing.minimumOmset) : "",
      percentage:   editing ? String(editing.percentage)   : "",
      sortOrder:    editing ? String(editing.sortOrder)    : "0",
    },
  });

  // Reset when dialog opens with new editing state
  const handleOpenChange = (v: boolean) => {
    if (!v) { reset(); onClose(); }
    onOpenChange(v);
  };

  const onSubmit = async (values: TierFormValues) => {
    const body = {
      minimumOmset: parseFloat(values.minimumOmset),
      percentage:   parseFloat(values.percentage),
      sortOrder:    parseInt(values.sortOrder, 10) || 0,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync(body);
        toast.success("Tier diperbarui");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Tier berhasil ditambahkan");
      }
      handleOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal menyimpan tier");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Tier Bonus" : "Tambah Tier Bonus"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Minimum Omset */}
          <div className="space-y-1.5">
            <Label htmlFor="minimumOmset">Minimum Omset (Rp)</Label>
            <Input
              id="minimumOmset"
              type="number"
              min={0}
              step={1000}
              placeholder="Contoh: 10000000"
              {...register("minimumOmset", {
                required: "Wajib diisi",
                min: { value: 0, message: "Minimal 0" },
              })}
            />
            {errors.minimumOmset && (
              <p className="text-xs text-destructive">{errors.minimumOmset.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Omset minimal untuk tier ini aktif
            </p>
          </div>

          {/* Persentase */}
          <div className="space-y-1.5">
            <Label htmlFor="percentage">Persentase Bonus (%)</Label>
            <Input
              id="percentage"
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              placeholder="Contoh: 2.5"
              {...register("percentage", {
                required: "Wajib diisi",
                min: { value: 0.01, message: "Minimal 0.01%" },
                max: { value: 100,  message: "Maksimal 100%" },
              })}
            />
            {errors.percentage && (
              <p className="text-xs text-destructive">{errors.percentage.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Bonus = omset aktual × persentase ini
            </p>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label htmlFor="sortOrder">Urutan</Label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              step={1}
              placeholder="0"
              {...register("sortOrder")}
            />
            <p className="text-xs text-muted-foreground">
              Urutan tampilan tier (opsional, default 0)
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── TierTable ─────────────────────────────────────────────────────────────────
function TierTable({
  tiers,
  isLoading,
  onEdit,
  onDelete,
}: {
  tiers:     OmsetBonusTier[];
  isLoading: boolean;
  onEdit:    (t: OmsetBonusTier) => void;
  onDelete:  (t: OmsetBonusTier) => void;
}) {
  if (isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Memuat…</div>;
  if (tiers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">Belum ada tier bonus omset</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tambah tier untuk mengaktifkan bonus omset karyawan ini
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Urutan</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Minimum Omset</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Persentase Bonus</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tiers.map((tier) => (
            <tr key={tier.id} className="bg-card hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-muted-foreground">{tier.sortOrder}</td>
              <td className="px-4 py-3 font-medium">{fmtIDR(tier.minimumOmset)}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {fmtPct(tier.percentage)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tier)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(tier)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface OmsetBonusTierTabProps {
  /**
   * When true, skips the employee picker entirely.
   * Must provide `fixedEmployee` when embedded=true.
   */
  embedded?:      boolean;
  fixedEmployee?: EmbeddedEmployee;
}

export function OmsetBonusTierTab({ embedded = false, fixedEmployee }: OmsetBonusTierTabProps = {}) {
  const [search,           setSearch]          = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | EmbeddedEmployee | null>(
    fixedEmployee ?? null,
  );
  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [editing,          setEditing]          = useState<OmsetBonusTier | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<OmsetBonusTier | null>(null);

  // In embedded mode skip fetching employee list (we already know the employee)
  const { data: employeesData } = useEmployees({ isActive: true, limit: 200 }, { enabled: !embedded });
  const employees = employeesData?.data ?? [];

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.employeeCode ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const { data: tiers = [], isLoading } = useOmsetBonusTiers(selectedEmployee?.id ?? "");
  const deleteMut = useDeleteOmsetBonusTier(selectedEmployee?.id ?? "");

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit   = (t: OmsetBonusTier) => { setEditing(t); setDialogOpen(true); };
  const openDelete = (t: OmsetBonusTier) => setDeleteTarget(t);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success("Tier berhasil dihapus");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal menghapus tier");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Employee list view (not shown in embedded mode) ───────────────────────
  if (!selectedEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Bonus Omset Karyawan</h3>
            <p className="text-xs text-muted-foreground">Pilih karyawan untuk mengatur tier bonus omset</p>
          </div>
        </div>

        <Input
          placeholder="Cari nama atau kode karyawan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setSelectedEmployee(emp)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md hover:border-primary/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.role.name}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
              Tidak ada karyawan ditemukan
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Detail view (selected employee) ───────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {embedded ? (
          // Embedded mode: no back button, no repeated employee name
          <p className="text-xs text-muted-foreground">Atur tier bonus omset untuk karyawan ini</p>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEmployee(null)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="text-sm font-semibold">{selectedEmployee.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedEmployee.role.name} · {selectedEmployee.employeeCode}
              </p>
            </div>
          </div>
        )}
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Tambah Tier
        </Button>
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <strong>Cara kerja:</strong> Sistem akan mencari tier tertinggi yang tercapai (omset ≥ minimum tier).
        Bonus = omset aktual × persentase tier tersebut. Jika tidak ada tier yang tercapai, tidak ada bonus.
      </div>

      {/* Tiers table */}
      <TierTable
        tiers={tiers}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* Add / Edit dialog */}
      {dialogOpen && (
        <TierDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          employeeId={selectedEmployee.id}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Tier Bonus?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tier dengan minimum omset{" "}
            <strong className="text-foreground">{deleteTarget ? fmtIDR(deleteTarget.minimumOmset) : ""}</strong>{" "}
            akan dihapus permanen dan tidak bisa dikembalikan.
          </p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
