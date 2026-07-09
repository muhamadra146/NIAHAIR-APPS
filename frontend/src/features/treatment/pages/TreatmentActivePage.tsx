import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Scissors, AlertTriangle, UserCheck, Calendar, ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import { useTreatments, useCreateTreatment } from "../hooks";
import { TreatmentStatusBadge } from "../components/TreatmentStatusBadge";
import { ElapsedTime } from "../components/ElapsedTime";
import type { TreatmentSession, TreatmentItem } from "../types";

function hasNoStaff(session: TreatmentSession): boolean {
  const items: TreatmentItem[] =
    (session as unknown as { treatmentItems?: TreatmentItem[] }).treatmentItems ??
    session.items ?? [];
  return items.length > 0 && items.every((ti) => !ti.assignments || ti.assignments.length === 0);
}

function getItemCount(session: TreatmentSession): number {
  const items: TreatmentItem[] =
    (session as unknown as { treatmentItems?: TreatmentItem[] }).treatmentItems ??
    session.items ?? [];
  return items.length;
}

export function TreatmentActivePage() {
  const { branchId } = useAuthStore();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useTreatments({
    branchId: branchId || undefined,
    limit:    200,
  });
  const createMutation = useCreateTreatment();

  const allSessions   = data?.data ?? [];
  const activeSessions = allSessions.filter((s) => !s.completedAt);

  return (
    <PageContainer>
      <div className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/treatments" className="text-sm text-muted-foreground hover:text-foreground">
                Treatment
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-xl font-bold tracking-tight">Aktif</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Memuat…" : `${activeSessions.length} sesi berlangsung`}
            </p>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={!branchId}>
            <Plus className="mr-2 h-4 w-4" />
            Sesi Baru
          </Button>
        </div>

        {!branchId && (
          <p className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu.
          </p>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
          </div>
        ) : activeSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <Scissors className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-medium">Tidak ada treatment aktif</p>
              <p className="text-sm text-muted-foreground">Semua treatment hari ini sudah selesai atau belum ada yang dimulai.</p>
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)} disabled={!branchId}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Buat Sesi Baru
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSessions.map((s) => (
              <ActiveSessionCard key={s.id} session={s} onOpen={() => navigate(`/treatments/${s.id}`)} />
            ))}
          </div>
        )}

      </div>

      <CreateTreatmentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
        onCreate={async (customerId, notes) => {
          const session = await createMutation.mutateAsync({
            customerId,
            branchId:  branchId!,
            notes:     notes || undefined,
            startedAt: new Date().toISOString(),
          });
          setFormOpen(false);
          navigate(`/treatments/${session.id}`);
        }}
        isPending={createMutation.isPending}
      />
    </PageContainer>
  );
}

function ActiveSessionCard({
  session,
  onOpen,
}: {
  session: TreatmentSession;
  onOpen:  () => void;
}) {
  const noStaff   = hasNoStaff(session);
  const itemCount = getItemCount(session);

  return (
    <Card className={cn("transition-shadow hover:shadow-md", noStaff && "border-amber-300")}>
      <CardContent className="p-4 space-y-3">

        {/* Top: customer + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-sm">{session.customer?.name ?? "—"}</p>
            {session.customer?.mobilePhone && (
              <p className="text-xs text-muted-foreground">{session.customer.mobilePhone}</p>
            )}
          </div>
          <TreatmentStatusBadge completedAt={session.completedAt} startedAt={session.startedAt} />
        </div>

        {/* Booking info */}
        {session.appointment && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">
              #{session.appointment.bookingNo} —{" "}
              {new Date(session.appointment.visitDate).toLocaleDateString("id-ID", {
                day: "2-digit", month: "short",
              })}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-muted-foreground">
            {itemCount > 0 ? `${itemCount} item` : "Belum ada item"}
          </span>
          {session.branch?.name && (
            <span className="text-xs text-muted-foreground">{session.branch.name}</span>
          )}
        </div>

        {/* Elapsed + warning */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Durasi:</span>
            <span className="text-xs font-mono font-semibold text-blue-700">
              <ElapsedTime startedAt={session.startedAt} />
            </span>
          </div>
          {noStaff && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Belum ada staff</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={onOpen}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Buka Treatment
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

interface CustomerOption {
  id:          string;
  name:        string;
  mobilePhone: string | null;
}

function CreateTreatmentDialog({
  open, onOpenChange, onCreate, isPending,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  branchId:     string;
  onCreate:     (customerId: string, notes: string) => Promise<void>;
  isPending:    boolean;
}) {
  const [custSearch,   setCustSearch]   = useState("");
  const [custResults,  setCustResults]  = useState<CustomerOption[]>([]);
  const [selectedCust, setSelectedCust] = useState<CustomerOption | null>(null);
  const [notes,        setNotes]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function resetForm() {
    setCustSearch(""); setCustResults([]); setSelectedCust(null); setNotes(""); setError(null);
  }

  function handleOpenChange(v: boolean) { if (!v) resetForm(); onOpenChange(v); }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setCustSearch(q);
    setSelectedCust(null);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setCustResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchCustomers({ search: q, limit: 8 });
        setCustResults((res.data as unknown as CustomerOption[]) ?? []);
      } finally { setLoading(false); }
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCust) { setError("Pilih customer terlebih dahulu"); return; }
    setError(null);
    try { await onCreate(selectedCust.id, notes); resetForm(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Gagal membuat sesi"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Buat Sesi Treatment Baru</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <Input
              value={selectedCust ? selectedCust.name : custSearch}
              onChange={handleSearchChange}
              onClick={() => { if (selectedCust) { setSelectedCust(null); setCustSearch(""); } }}
              placeholder="Cari nama customer…"
            />
            {!selectedCust && custResults.length > 0 && (
              <div className="rounded-md border border-input bg-background shadow-sm">
                {custResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCust(c); setCustSearch(""); setCustResults([]); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.mobilePhone && (
                      <span className="ml-2 text-xs text-muted-foreground">{c.mobilePhone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {loading && <p className="text-xs text-muted-foreground">Mencari…</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan (opsional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isPending || !selectedCust}>
              {isPending ? "Membuat…" : "Buat & Buka"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
