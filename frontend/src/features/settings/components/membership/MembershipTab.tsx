import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useMemberships, useCreateMembership, useUpdateMembership, useDeleteMembership } from "../../hooks";
import { useItemCategories } from "@/features/inventory/hooks";
import type { ItemCategory } from "@/features/inventory/types";
import type { Membership, CreateMembershipInput, UpdateMembershipInput, DiscountType } from "../../types";

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

const IDR = (v: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v));

interface FormState {
  name:         string;
  price:        string;
  durationDays: string;
  discountType:  DiscountType;
  discountValue: string;
  /** Kategori item yang dapat diskon membership */
  categoryIds:   string[];
}

const EMPTY: FormState = {
  name: "", price: "", durationDays: "30",
  discountType: "PERCENTAGE", discountValue: "0", categoryIds: [],
};

/** Kategori induk + sub-kategorinya, urut nama */
function categoryTree(categories: ItemCategory[]) {
  const byName = (a: ItemCategory, b: ItemCategory) => a.name.localeCompare(b.name);
  const ids = new Set(categories.map((c) => c.id));
  return categories
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .sort(byName)
    .map((parent) => ({ parent, children: categories.filter((c) => c.parentId === parent.id).sort(byName) }));
}

/** Pilihan kategori diskon: centang induk = semua sub-kategorinya ikut */
function DiscountCategoryPicker({ categories, value, onChange }: {
  categories: ItemCategory[];
  value:      string[];
  onChange:   (ids: string[]) => void;
}) {
  const selected = new Set(value);
  const toggle = (id: string, childIds: string[] = []) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else { next.add(id); childIds.forEach((c) => next.delete(c)); }   // induk sudah mencakup sub-kategori
    onChange([...next]);
  };
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
      {categoryTree(categories).map(({ parent, children }) => {
        const parentOn = selected.has(parent.id);
        return (
          <div key={parent.id}>
            <label className="flex items-center gap-2 rounded px-1 py-0.5 text-sm font-medium hover:bg-slate-50">
              <input type="checkbox" checked={parentOn} onChange={() => toggle(parent.id, children.map((c) => c.id))} />
              {parent.name}
              {children.length > 0 && <span className="text-xs font-normal text-muted-foreground">(semua sub-kategori)</span>}
            </label>
            {children.length > 0 && (
              <div className="ml-6 grid grid-cols-2 gap-x-2">
                {children.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs ${parentOn ? "text-muted-foreground" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" disabled={parentOn} checked={parentOn || selected.has(c.id)} onChange={() => toggle(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function toForm(m: Membership): FormState {
  return {
    name:          m.name,
    price:         String(m.price),
    durationDays:  String(m.durationDays),
    discountType:  m.discountType,
    discountValue: String(m.discountValue),
    categoryIds:   (m.discountCategories ?? []).map((d) => d.categoryId),
  };
}

export function MembershipTab() {
  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<Membership | null>(null);
  const [form,     setForm]       = useState<FormState>(EMPTY);
  const [error,    setError]      = useState<string | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const { data, isLoading } = useMemberships({ limit: 100 });
  const { data: categories = [] } = useItemCategories();
  const memberships = data?.data ?? [];

  const createMut = useCreateMembership();
  const updateMut = useUpdateMembership(editItem?.id ?? "");
  const deleteMut = useDeleteMembership();
  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  function openCreate() {
    setEditItem(null);
    // Default paket baru: diskon untuk kategori JASA (treatment)
    const jasa = categories.find((c) => !c.parentId && c.name.toUpperCase() === "JASA");
    setForm({ ...EMPTY, categoryIds: jasa ? [jasa.id] : [] });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(m: Membership) {
    setEditItem(m);
    setForm(toForm(m));
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    try {
      if (editItem) {
        const input: UpdateMembershipInput = {
          name:          form.name,
          price:         Number(form.price),
          durationDays:  Number(form.durationDays),
          discountType:  form.discountType,
          discountValue: Number(form.discountValue),
          categoryIds:   form.categoryIds,
        };
        await updateMut.mutateAsync(input);
      } else {
        const input: CreateMembershipInput = {
          name:          form.name,
          price:         Number(form.price),
          durationDays:  Number(form.durationDays),
          discountType:  form.discountType,
          discountValue: Number(form.discountValue),
          categoryIds:   form.categoryIds,
        };
        await createMut.mutateAsync(input);
      }
      setFormOpen(false);
    } catch (err) { setError(apiErr(err)); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // error handled by hook's onError toast
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Membership</h2>
          <p className="text-sm text-muted-foreground">Kelola paket membership pelanggan</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Membership
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/70">
              {["Nama", "Harga", "Durasi", "Tipe Diskon", "Nilai Diskon", "Diskon Untuk", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : memberships.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada membership</td></tr>
            ) : memberships.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3">{IDR(m.price)}</td>
                <td className="px-4 py-3">{m.durationDays} hari</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={m.discountType === "PERCENTAGE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                    {m.discountType === "PERCENTAGE" ? "Persentase" : "Nominal"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {m.discountType === "PERCENTAGE"
                    ? `${m.discountValue}%`
                    : IDR(m.discountValue)}
                </td>
                <td className="px-4 py-3">
                  {(m.discountCategories ?? []).length === 0
                    ? <span className="text-xs text-amber-600">Belum ada kategori</span>
                    : <div className="flex flex-wrap gap-1">
                        {m.discountCategories!.map((d) => (
                          <Badge key={d.categoryId} variant="outline" className="text-[11px]">{d.category.name}</Badge>
                        ))}
                      </div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Membership" : "Tambah Membership"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                placeholder="cth: Gold Member"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Harga (Rp)</Label>
              <CurrencyInput
                placeholder="cth: 500.000"
                value={form.price}
                onValueChange={(v) => setForm((f) => ({ ...f, price: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Durasi (hari)</Label>
              <Input
                type="number" min={1}
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipe Diskon</Label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="PERCENTAGE">Persentase (%)</option>
                <option value="FIXED_AMOUNT">Nominal (Rp)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nilai Diskon {form.discountType === "PERCENTAGE" ? "(%)" : "(Rp)"}</Label>
              {form.discountType === "PERCENTAGE" ? (
                <Input
                  type="number" min={0} max={100} step={1}
                  placeholder="cth: 10"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                />
              ) : (
                <CurrencyInput
                  placeholder="cth: 50.000"
                  value={form.discountValue}
                  onValueChange={(v) => setForm((f) => ({ ...f, discountValue: v }))}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Diskon Berlaku Untuk Kategori</Label>
              <DiscountCategoryPicker
                categories={categories}
                value={form.categoryIds}
                onChange={(ids) => setForm((f) => ({ ...f, categoryIds: ids }))}
              />
              <p className="text-xs text-muted-foreground">
                Item bertanda "Tidak kena diskon member" (Ongkos PP, Charge, dll.) tetap tidak didiskon. Atur di Komisi → Master Item.
              </p>
              {form.categoryIds.length === 0 && (
                <p className="text-xs text-amber-600">Belum ada kategori dipilih — paket ini tidak memberi diskon apa pun.</p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name || !form.price}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Membership</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus membership ini? Membership yang sedang digunakan pelanggan tidak bisa dihapus.
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
