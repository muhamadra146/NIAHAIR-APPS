import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Scissors, Activity, CheckCircle2, AlertCircle, Clock, ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import { useTreatments, useCreateTreatment } from "../hooks";
import { TreatmentStatusBadge } from "../components/TreatmentStatusBadge";
import { ElapsedTime } from "../components/ElapsedTime";
import type { TreatmentItem } from "../types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function durationMinutes(startedAt: string | null, completedAt: string | null): number | null {
  if (!startedAt || !completedAt) return null;
  return Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000);
}

export function TreatmentListPage() {
  const { branchId } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const today = todayISO();

  const { data, isLoading } = useTreatments({
    branchId:  branchId || undefined,
    startDate: today,
    endDate:   today,
    limit:     200,
  });
  const createMutation = useCreateTreatment();

  const sessions = data?.data ?? [];

  const stats = useMemo(() => {
    const active    = sessions.filter((s) => !s.completedAt);
    const completed = sessions.filter((s) => !!s.completedAt);

    const waitingStaff = active.filter((s) => {
      const items: TreatmentItem[] =
        (s as unknown as { treatmentItems?: TreatmentItem[] }).treatmentItems ?? s.items ?? [];
      return items.every((ti) => !ti.assignments || ti.assignments.length === 0);
    });

    const durations = completed
      .map((s) => durationMinutes(s.startedAt, s.completedAt))
      .filter((d): d is number => d !== null);

    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    return { active, completed, waitingStaff, avgDuration };
  }, [sessions]);

  const statCards = [
    {
      key:    "active",
      label:  "Aktif Sekarang",
      value:  stats.active.length,
      icon:   Activity,
      accent: "bg-blue-100 text-blue-700",
      href:   "/treatments/active",
    },
    {
      key:    "completed",
      label:  "Selesai Hari Ini",
      value:  stats.completed.length,
      icon:   CheckCircle2,
      accent: "bg-emerald-100 text-emerald-700",
      href:   "/treatments/completed",
    },
    {
      key:    "waiting",
      label:  "Tunggu Staff",
      value:  stats.waitingStaff.length,
      icon:   AlertCircle,
      accent: stats.waitingStaff.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500",
      href:   "/treatments/active",
    },
    {
      key:    "avg",
      label:  "Rata-rata Durasi",
      value:  stats.avgDuration !== null ? `${stats.avgDuration}m` : "—",
      icon:   Clock,
      accent: "bg-purple-100 text-purple-700",
      href:   null,
    },
  ] as const;

  return (
    <PageContainer>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Treatment</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Memuat data hari ini…" : `${sessions.length} sesi hari ini`}
            </p>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={!branchId}>
            <Plus className="mr-2 h-4 w-4" />
            Sesi Baru
          </Button>
        </div>

        {!branchId && (
          <p className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu untuk melihat data treatment.
          </p>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(({ key, label, value, icon: Icon, accent, href }) => (
            <Card
              key={key}
              className={cn(href && "cursor-pointer transition-shadow hover:shadow-md")}
            >
              <CardContent className="p-4">
                {href ? (
                  <Link to={href} className="block">
                    <StatCardInner Icon={Icon} label={label} value={value} accent={accent} isLoading={isLoading} />
                  </Link>
                ) : (
                  <StatCardInner Icon={Icon} label={label} value={value} accent={accent} isLoading={isLoading} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick nav buttons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/treatments/active">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Activity className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Treatment Aktif</p>
                    <p className="text-xs text-muted-foreground">
                      {isLoading ? "…" : `${stats.active.length} sesi berlangsung`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/treatments/completed">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Treatment Selesai</p>
                    <p className="text-xs text-muted-foreground">Riwayat & rekap treatment</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Today sessions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Aktivitas Hari Ini
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
                <Scissors className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada sesi treatment hari ini.</p>
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)} disabled={!branchId}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Buat Sesi Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 10).map((s) => (
                <Link key={s.id} to={`/treatments/${s.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-muted/30">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm select-none">
                        {(s.customer?.name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.appointment?.bookingNo
                            ? `#${s.appointment.bookingNo}`
                            : s.branch?.name ?? "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!s.completedAt && s.startedAt && (
                          <span className="text-xs font-mono text-muted-foreground">
                            <ElapsedTime startedAt={s.startedAt} />
                          </span>
                        )}
                        <TreatmentStatusBadge
                          completedAt={s.completedAt}
                          startedAt={s.startedAt}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {sessions.length > 10 && (
                <Link to="/treatments/active">
                  <p className="py-2 text-center text-xs text-primary hover:underline">
                    +{sessions.length - 10} sesi lainnya →
                  </p>
                </Link>
              )}
            </div>
          )}
        </div>

      </div>

      <CreateTreatmentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
        onCreate={async (customerId, notes) => {
          try {
            await createMutation.mutateAsync({
              customerId,
              branchId: branchId!,
              notes:     notes || undefined,
              startedAt: new Date().toISOString(),
            });
            setFormOpen(false);
          } catch { /* error handled by hook onError */ }
        }}
        isPending={createMutation.isPending}
      />
    </PageContainer>
  );
}

function StatCardInner({
  Icon, label, value, accent, isLoading,
}: {
  Icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-10" />
        ) : (
          <p className="mt-0.5 text-sm font-semibold leading-tight">{value}</p>
        )}
      </div>
    </div>
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
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  branchId:      string;
  onCreate:      (customerId: string, notes: string) => Promise<void>;
  isPending:     boolean;
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

  function handleOpenChange(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

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
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCust) { setError("Pilih customer terlebih dahulu"); return; }
    setError(null);
    try {
      await onCreate(selectedCust.id, notes);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat sesi");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Buat Sesi Treatment Baru</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <div className="relative">
              <Input
                value={selectedCust ? selectedCust.name : custSearch}
                onChange={handleSearchChange}
                onClick={() => { if (selectedCust) { setSelectedCust(null); setCustSearch(""); } }}
                placeholder="Cari nama customer…"
              />
            </div>
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
            {loading && (
              <Badge variant="secondary" className="w-fit text-xs">Mencari…</Badge>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan (opsional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Catatan tambahan…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || !selectedCust}>
              {isPending ? "Membuat…" : "Buat Sesi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
