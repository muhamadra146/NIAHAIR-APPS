import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, UserPlus, CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { useEmployees } from "@/features/employee/hooks";
import {
  useTreatment,
  useUpdateTreatment,
  useTreatmentItems,
  useCreateTreatmentItem,
  useDeleteTreatmentItem,
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useItemSearch,
  useUnits,
} from "../hooks";
import type { TreatmentItem, ItemSearchResult } from "../types";

export function TreatmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading, isError } = useTreatment(id!);
  const updateMutation = useUpdateTreatment(id!);
  const { data: items = [], isLoading: itemsLoading } = useTreatmentItems(id!);
  const createItemMutation = useCreateTreatmentItem(id!);
  const deleteItemMutation = useDeleteTreatmentItem(id!);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [assignOpen, setAssignOpen]   = useState<string | null>(null); // treatmentItemId

  async function handleComplete() {
    await updateMutation.mutateAsync({ completedAt: new Date().toISOString() });
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !session) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Sesi tidak ditemukan.{" "}
          <Link to="/treatments" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const isCompleted = !!session.completedAt;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/treatments"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {session.customer?.name ?? "—"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{session.branch?.name ?? "—"}</span>
                {isCompleted
                  ? <Badge className="bg-green-600 text-xs">Selesai</Badge>
                  : <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Berlangsung</Badge>
                }
              </div>
            </div>
            {!isCompleted && (
              <Button size="sm" onClick={handleComplete} disabled={updateMutation.isPending} className="shrink-0">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Selesaikan
              </Button>
            )}
          </div>
        </div>

        {/* Session info */}
        <Card>
          <CardContent className="pt-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <InfoRow label="Mulai"   value={session.startedAt ? new Date(session.startedAt).toLocaleString("id-ID") : "—"} />
            <InfoRow label="Selesai" value={session.completedAt ? new Date(session.completedAt).toLocaleString("id-ID") : "—"} />
            <InfoRow label="Dibuat"  value={formatDate(session.createdAt)} />
            {session.appointmentId && <InfoRow label="Booking" value={<Link to={`/appointments/${session.appointmentId}`} className="text-primary underline text-xs">Lihat Booking</Link>} />}
            {session.notes && <InfoRow label="Catatan" value={session.notes} />}
          </CardContent>
        </Card>

        {/* Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Item Treatment ({items.length})</h2>
            {!isCompleted && (
              <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Item
              </Button>
            )}
          </div>

          {itemsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Belum ada item. Tambah item treatment.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <TreatmentItemCard
                  key={item.id}
                  item={item}
                  sessionId={id!}
                  isCompleted={isCompleted}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                  onAssign={() => setAssignOpen(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add item dialog */}
      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        onSubmit={async (itemId, unitId, qty, notes) => {
          await createItemMutation.mutateAsync({ itemId, unitId, qty, notes: notes || undefined });
          setAddItemOpen(false);
        }}
        isPending={createItemMutation.isPending}
      />

      {/* Assign staff dialog */}
      {assignOpen && (
        <AssignStaffDialog
          open={!!assignOpen}
          onOpenChange={(v) => { if (!v) setAssignOpen(null); }}
          sessionId={id!}
          itemId={assignOpen}
          isCompleted={isCompleted}
        />
      )}
    </PageContainer>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function TreatmentItemCard({
  item, sessionId, isCompleted, onDelete, onAssign,
}: {
  item: TreatmentItem;
  sessionId: string;
  isCompleted: boolean;
  onDelete: () => void;
  onAssign: () => void;
}) {
  const { data: assignments = [] } = useAssignments(sessionId, item.id);
  const deleteAssignMutation = useDeleteAssignment(sessionId, item.id);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-medium">
            {item.item?.name ?? item.itemId}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {item.qty} {item.unit?.name ?? ""} · {item.item?.itemCode}
          </p>
        </div>
        {!isCompleted && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAssign}>
              <UserPlus className="mr-1 h-3 w-3" />
              Staff
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={(item._count?.assignments ?? assignments.length) > 0}
              title={(item._count?.assignments ?? assignments.length) > 0 ? "Hapus assignment terlebih dahulu" : "Hapus item"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      {assignments.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="space-y-1">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5 text-xs">
                <span className="font-medium">{a.employee?.name ?? a.employeeId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">workQty: {a.workQty}</span>
                  {!isCompleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => deleteAssignMutation.mutate(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Add item dialog ───────────────────────────────────────────────────────────

function AddItemDialog({
  open, onOpenChange, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (itemId: string, unitId: string, qty: number, notes: string) => Promise<void>;
  isPending: boolean;
}) {
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<ItemSearchResult | null>(null);
  const [unitId, setUnitId]             = useState("");
  const [qty, setQty]                   = useState("1");
  const [notes, setNotes]               = useState("");
  const [error, setError]               = useState<string | null>(null);
  const { data: results = [] }          = useItemSearch(search);
  const { data: units = [] }            = useUnits();

  function reset() { setSearch(""); setSelected(null); setUnitId(""); setQty("1"); setNotes(""); setError(null); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected)  { setError("Pilih item"); return; }
    if (!unitId)    { setError("Pilih satuan"); return; }
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) { setError("Qty harus > 0"); return; }
    setError(null);
    try { await onSubmit(selected.id, unitId, q, notes); reset(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Gagal menambah item"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Item Treatment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Item search */}
          <div className="flex flex-col gap-1.5">
            <Label>Item *</Label>
            <Input
              value={selected ? `${selected.name} (${selected.itemCode})` : search}
              onChange={(e) => { setSearch(e.target.value); if (selected) setSelected(null); }}
              placeholder="Cari nama atau kode item..."
            />
            {!selected && results.length > 0 && (
              <div className="rounded-md border border-input bg-background shadow-sm max-h-48 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelected(r); setSearch(""); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.itemCode} · {r.itemType}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Unit */}
          <div className="flex flex-col gap-1.5">
            <Label>Satuan *</Label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Pilih satuan</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          {/* Qty */}
          <div className="flex flex-col gap-1.5">
            <Label>Qty *</Label>
            <Input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Menambahkan…" : "Tambah"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign staff dialog ───────────────────────────────────────────────────────

function AssignStaffDialog({
  open, onOpenChange, sessionId, itemId, isCompleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  itemId: string;
  isCompleted: boolean;
}) {
  const createAssignMutation = useCreateAssignment(sessionId, itemId);
  const { data: employees = [] } = useEmployees({ isActive: true, limit: 100 });
  const [empId, setEmpId]       = useState("");
  const [workQty, setWorkQty]   = useState("1");
  const [notes, setNotes]       = useState("");
  const [error, setError]       = useState<string | null>(null);

  function reset() { setEmpId(""); setWorkQty("1"); setNotes(""); setError(null); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empId) { setError("Pilih karyawan"); return; }
    const q = parseFloat(workQty);
    if (isNaN(q) || q <= 0) { setError("Work qty harus > 0"); return; }
    setError(null);
    try {
      await createAssignMutation.mutateAsync({ employeeId: empId, workQty: q, notes: notes || undefined });
      reset();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Gagal menugaskan"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Tugaskan Staff</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Karyawan *</Label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Pilih karyawan</option>
              {(employees.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.role.name})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Work Qty *</Label>
            <Input type="number" min="0.01" step="0.01" value={workQty} onChange={(e) => setWorkQty(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
            <Button type="submit" disabled={createAssignMutation.isPending || isCompleted}>
              {createAssignMutation.isPending ? "Menugaskan…" : "Tugaskan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}: </span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}
