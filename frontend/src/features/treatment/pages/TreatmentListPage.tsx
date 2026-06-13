import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import { formatDate } from "@/lib/utils";
import { useTreatments, useCreateTreatment } from "../hooks";

interface CustomerOption { id: string; name: string; mobilePhone: string | null }

export function TreatmentListPage() {
  const { branchId } = useAuthStore();
  const [page, setPage]         = useState(1);
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useTreatments({
    page, limit: 20,
    branchId:  branchId || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });
  const createMutation = useCreateTreatment();

  const sessions   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Treatment</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} sesi` : "Catat sesi perawatan"}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm" disabled={!branchId}>
            <Plus className="mr-2 h-4 w-4" />
            Sesi Baru
          </Button>
        </div>

        {!branchId && (
          <p className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu untuk melihat data treatment.
          </p>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="h-9 w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="h-9 w-36" />
              </div>
              {(startDate || endDate) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs">
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada sesi treatment.</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="divide-y divide-border md:hidden">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge completedAt={s.completedAt} />
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                          <Link to={`/treatments/${s.id}`}><Eye className="mr-1 h-3 w-3" />Detail</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cabang</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mulai</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Selesai</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.customer?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{s.customer?.mobilePhone ?? ""}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{s.branch?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {s.startedAt ? new Date(s.startedAt).toLocaleString("id-ID") : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {s.completedAt ? new Date(s.completedAt).toLocaleString("id-ID") : "—"}
                          </td>
                          <td className="px-4 py-3"><StatusBadge completedAt={s.completedAt} /></td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/treatments/${s.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </div>

      <CreateTreatmentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
        onCreate={async (customerId, notes) => {
          await createMutation.mutateAsync({ customerId, branchId: branchId!, notes: notes || undefined, startedAt: new Date().toISOString() });
          setFormOpen(false);
        }}
        isPending={createMutation.isPending}
      />
    </PageContainer>
  );
}

function StatusBadge({ completedAt }: { completedAt: string | null }) {
  return completedAt
    ? <Badge variant="default" className="text-xs bg-green-600">Selesai</Badge>
    : <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Berlangsung</Badge>;
}

function CreateTreatmentDialog({
  open, onOpenChange, branchId, onCreate, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  onCreate: (customerId: string, notes: string) => Promise<void>;
  isPending: boolean;
}) {
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<CustomerOption[]>([]);
  const [selectedCust, setSelectedCust] = useState<CustomerOption | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        <DialogHeader><DialogTitle>Buat Sesi Treatment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={selectedCust ? selectedCust.name : custSearch}
                onChange={handleSearchChange}
                onClick={() => { if (selectedCust) { setSelectedCust(null); setCustSearch(""); } }}
                placeholder="Cari nama customer..."
                className="pl-8"
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
                    {c.mobilePhone && <span className="ml-2 text-xs text-muted-foreground">{c.mobilePhone}</span>}
                  </button>
                ))}
              </div>
            )}
            {loading && <p className="text-xs text-muted-foreground">Mencari...</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isPending || !selectedCust}>
              {isPending ? "Membuat…" : "Buat Sesi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
