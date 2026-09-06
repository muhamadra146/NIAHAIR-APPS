import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Crown, Percent, DollarSign, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageContainer }    from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }           from "@/components/ui/button";
import { Badge }            from "@/components/ui/badge";
import { Input }            from "@/components/ui/input";
import { Label }            from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ── ConfirmDialog helper ───────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, description, confirmLabel = "Ya, hapus", loading = false,
  onConfirm, onCancel,
}: {
  open: boolean; title: string; description: React.ReactNode;
  confirmLabel?: string; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Batal</Button>
          <Button
            onClick={onConfirm} disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useAuthStore } from "@/stores/authStore";
import { useMemberships, useCreateMembership, useUpdateMembership, useDeleteMembership } from "../hooks";
import type { Membership } from "../types";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function discountLabel(m: Membership) {
  if (m.discountType === "PERCENTAGE") {
    return `${m.discountValue}%`;
  }
  return formatCurrency(m.discountValue);
}

// ── Schema ────────────────────────────────────────────────────────────────────

const membershipSchema = z.object({
  name:          z.string().min(1, "Nama wajib diisi"),
  price:         z.coerce.number().min(0, "Harga tidak boleh negatif"),
  durationDays:  z.coerce.number().min(1, "Minimal 1 hari"),
  discountType:  z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.coerce.number().min(0, "Nilai diskon tidak boleh negatif"),
});

type MembershipForm = z.infer<typeof membershipSchema>;

// ── MembershipDialog ──────────────────────────────────────────────────────────

interface MembershipDialogProps {
  open:      boolean;
  editing:   Membership | null;
  onClose:   () => void;
}

function MembershipDialog({ open, editing, onClose }: MembershipDialogProps) {
  const createMut = useCreateMembership();
  const updateMut = useUpdateMembership();

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<MembershipForm>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      name:          editing?.name          ?? "",
      price:         editing?.price         ?? 0,
      durationDays:  editing?.durationDays  ?? 30,
      discountType:  editing?.discountType  ?? "PERCENTAGE",
      discountValue: editing?.discountValue ?? 0,
    },
  });

  const discountType = watch("discountType");
  const isPending    = createMut.isPending || updateMut.isPending;

  // When dialog opens with a different `editing`, sync form
  const [prevEditing, setPrevEditing] = useState<Membership | null>(null);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    reset({
      name:          editing?.name          ?? "",
      price:         editing?.price         ?? 0,
      durationDays:  editing?.durationDays  ?? 30,
      discountType:  editing?.discountType  ?? "PERCENTAGE",
      discountValue: editing?.discountValue ?? 0,
    });
  }

  const onSubmit = async (values: MembershipForm) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, input: values });
    } else {
      await createMut.mutateAsync(values);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Membership" : "Tambah Membership"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama Paket <span className="text-destructive">*</span></Label>
            <Input id="name" {...register("name")} placeholder="Contoh: Gold Member" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Harga & Durasi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Harga (Rp) <span className="text-destructive">*</span></Label>
              <Input id="price" type="number" min={0} step={1000} {...register("price")} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationDays">Durasi (hari) <span className="text-destructive">*</span></Label>
              <Input id="durationDays" type="number" min={1} {...register("durationDays")} />
              {errors.durationDays && <p className="text-xs text-destructive">{errors.durationDays.message}</p>}
            </div>
          </div>

          {/* Diskon */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipe Diskon <span className="text-destructive">*</span></Label>
              <SimpleSelect
                value={discountType}
                onChange={(v) => setValue("discountType", v as "PERCENTAGE" | "FIXED_AMOUNT")}
                options={[
                  { value: "PERCENTAGE",   label: "Persentase (%)" },
                  { value: "FIXED_AMOUNT", label: "Nominal (Rp)" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discountValue">
                Nilai Diskon {discountType === "PERCENTAGE" ? "(%)" : "(Rp)"}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="discountValue"
                type="number"
                min={0}
                step={discountType === "PERCENTAGE" ? 1 : 1000}
                {...register("discountValue")}
              />
              {errors.discountValue && <p className="text-xs text-destructive">{errors.discountValue.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editing ? "Simpan Perubahan" : "Tambah Membership"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MembershipPage() {
  const roleCode  = useAuthStore((s) => s.user?.roleCode);
  const canWrite  = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(roleCode ?? "");

  const { data, isLoading, isError, refetch } = useMemberships({ limit: 100 });
  const deleteMut = useDeleteMembership();

  const memberships = data?.data ?? [];

  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editing, setEditing]             = useState<Membership | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Membership | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit   = (m: Membership) => { setEditing(m); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <PageContainer
      title="Membership"
      subtitle="Kelola paket membership pelanggan — harga, durasi, dan diskon"
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Memuat..." : `${memberships.length} paket membership`}
          </p>
          {canWrite && (
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Tambah Membership
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm font-medium text-destructive">Gagal memuat data membership</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Coba lagi
            </Button>
          </div>
        ) : memberships.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
            <Crown className="h-10 w-10 opacity-20" />
            <p className="text-sm">Belum ada paket membership.</p>
            {canWrite && (
              <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Tambah Sekarang
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paket</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Harga</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durasi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diskon</th>
                      {canWrite && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {memberships.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-semibold">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCurrency(m.price)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{m.durationDays} hari</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {m.discountType === "PERCENTAGE"
                              ? <Percent className="h-3.5 w-3.5 text-emerald-600" />
                              : <DollarSign className="h-3.5 w-3.5 text-blue-600" />}
                            <span className={`text-sm font-medium ${
                              m.discountType === "PERCENTAGE" ? "text-emerald-600" : "text-blue-600"
                            }`}>
                              {discountLabel(m)}
                            </span>
                          </div>
                        </td>
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(m)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {memberships.map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="font-semibold">{m.name}</p>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-muted-foreground">
                      <span>Harga</span>
                      <span className="text-right font-mono font-medium text-foreground">
                        {formatCurrency(m.price)}
                      </span>
                      <span>Durasi</span>
                      <span className="text-right"><Badge variant="secondary">{m.durationDays} hari</Badge></span>
                      <span>Diskon</span>
                      <span className={`text-right font-medium ${
                        m.discountType === "PERCENTAGE" ? "text-emerald-600" : "text-blue-600"
                      }`}>
                        {discountLabel(m)}
                        {" "}
                        <span className="text-xs text-muted-foreground">
                          ({m.discountType === "PERCENTAGE" ? "%" : "Rp"})
                        </span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit dialog */}
      <MembershipDialog
        open={dialogOpen}
        editing={editing}
        onClose={closeDialog}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Membership?"
        description={<>Paket <strong>{deleteTarget?.name}</strong> akan dihapus permanen. Pastikan tidak ada pelanggan aktif yang menggunakan paket ini.</>}
        confirmLabel="Hapus"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
