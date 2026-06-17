import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Search, ArrowRight, Eye, Trash2 } from "lucide-react";
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
import { formatDate, formatCurrency } from "@/lib/utils";
import { useDeposits, useCreateDeposit, useDeleteDeposit, useDepositSummary } from "../hooks";
import type { DepositStatus, Deposit } from "../types";

const ALL_STATUSES: DepositStatus[] = ["UNPAID", "PAID", "PARTIAL_USED", "USED"];

const STATUS_LABEL: Record<string, string> = {
  UNPAID:       "Belum Dibayar",
  PAID:         "Aktif",
  PARTIAL_USED: "Sebagian Terpakai",
  USED:         "Habis",
};

const STATUS_BADGE: Record<string, string> = {
  UNPAID:       "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL_USED: "bg-blue-50 text-blue-700 border-blue-200",
  USED:         "bg-slate-50 text-slate-500 border-slate-200",
};

const CAN_DELETE: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

// Shared input/select class used across filter controls
const filterInputCls = "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus:shadow-md focus-visible:ring-ring/30";

export function DepositListPage() {
  const { branchId, user } = useAuthStore();
  const navigate = useNavigate();
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState<string>("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [custSearch, setCustSearch]     = useState("");
  const [custResults, setCustResults]   = useState<{ id: string; name: string }[]>([]);
  const [selectedCust, setSelectedCust] = useState<{ id: string; name: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Deposit | null>(null);
  const filterTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [createdDeposit, setCreatedDeposit] = useState<{ id: string; name: string; amount: string; date: string } | null>(null);

  const deleteMutation = useDeleteDeposit();
  const canDelete = user ? CAN_DELETE.includes(user.roleCode) : false;
  const { data: summary } = useDepositSummary({ branchId: branchId || undefined });

  const { data, isLoading } = useDeposits({
    page, limit: 20,
    branchId:   branchId         || undefined,
    status:     status           || undefined,
    startDate:  startDate        || undefined,
    endDate:    endDate          || undefined,
    customerId: selectedCust?.id || undefined,
  });

  const createMutation = useCreateDeposit();
  const deposits   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  function handleCustSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setCustSearch(q);
    setSelectedCust(null);
    setPage(1);
    clearTimeout(filterTimerRef.current);
    if (q.length < 2) { setCustResults([]); return; }
    filterTimerRef.current = setTimeout(async () => {
      const res = await fetchCustomers({ search: q, limit: 8 });
      setCustResults((res.data as unknown as { id: string; name: string }[]) ?? []);
    }, 300);
  }

  function clearCust() {
    setSelectedCust(null); setCustSearch(""); setCustResults([]); setPage(1);
  }

  function resetFilters() {
    clearCust(); setStatus(""); setStart(""); setEnd(""); setPage(1);
  }

  const hasFilter = !!(selectedCust || status || startDate || endDate);

  return (
    <PageContainer>
      <div className="space-y-5 sm:space-y-6">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Deposit</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} deposit` : "Kelola deposit customer"}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm" disabled={!branchId}>
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden xs:inline">Tambah </span>Deposit
          </Button>
        </div>

        {/* ── Summary cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["UNPAID", "PAID", "PARTIAL_USED", "USED"] as const).map((s) => (
            <Card
              key={s}
              onClick={() => { setStatus(status === s ? "" : s); setPage(1); }}
              className={[
                "cursor-pointer rounded-2xl border bg-white shadow-sm transition-all duration-200",
                status === s
                  ? "border-primary/40 ring-2 ring-primary/20 shadow-md"
                  : "border-slate-100/80 hover:border-primary/30 hover:shadow-md",
              ].join(" ")}
            >
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {STATUS_LABEL[s]}
                </p>
                <p className="mt-1.5 text-base font-bold sm:text-lg">
                  {formatCurrency(summary?.[s]?.total ?? "0")}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {summary?.[s]?.count ?? 0} deposit
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filter + table card ──────────────────────────────── */}
        <Card className="rounded-2xl border border-slate-100/80 bg-white shadow-sm overflow-hidden">

          {/* Filter bar */}
          <CardHeader className="border-b border-slate-100 pb-4 pt-4">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">

              {/* Customer search */}
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-auto">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Customer
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={selectedCust ? selectedCust.name : custSearch}
                    onChange={handleCustSearch}
                    onClick={() => { if (selectedCust) clearCust(); }}
                    placeholder="Cari customer..."
                    className={`${filterInputCls} pl-8 w-full sm:w-44`}
                  />
                  {!selectedCust && custResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-lg">
                      {custResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedCust(c); setCustSearch(""); setCustResults([]); setPage(1); }}
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-auto">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Status
                </Label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className={`${filterInputCls} px-3 text-sm w-full sm:w-auto`}
                >
                  <option value="">Semua Status</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Dari</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStart(e.target.value); setPage(1); }}
                  className={`${filterInputCls} w-full sm:w-36`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Sampai</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEnd(e.target.value); setPage(1); }}
                  className={`${filterInputCls} w-full sm:w-36`}
                />
              </div>

              {hasFilter && (
                <div className="col-span-2 flex items-end sm:col-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 w-full text-xs text-slate-500 hover:text-slate-800 sm:w-auto"
                  >
                    Reset Filter
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {/* Data */}
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : deposits.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-400">
                Tidak ada deposit ditemukan.
              </p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {deposits.map((d) => (
                    <DepositCard key={d.id} deposit={d} canDelete={canDelete} onDelete={() => setDeleteTarget(d)} />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tanggal</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Jumlah</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Terpakai</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Sisa</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map((d) => (
                        <DepositRow key={d.id} deposit={d} canDelete={canDelete} onDelete={() => setDeleteTarget(d)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Pagination ───────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <CreateDepositDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (customerId, customerName, amount, notes, payDate) => {
          const result = await createMutation.mutateAsync({ customerId, amount, notes: notes || undefined });
          setFormOpen(false);
          setCreatedDeposit({ id: (result as Deposit).id, name: customerName, amount: String(amount), date: payDate });
        }}
        isPending={createMutation.isPending}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus Deposit</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus deposit{" "}
            <span className="font-medium text-foreground">{deleteTarget?.customer?.name}</span>
            {" "}sebesar{" "}
            <span className="font-medium text-foreground">{formatCurrency(deleteTarget?.amount ?? "0")}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteMutation.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {deleteMutation.isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdDeposit} onOpenChange={(v) => { if (!v) setCreatedDeposit(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Deposit Berhasil Dibuat</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1 text-sm">
            <p className="text-muted-foreground">
              Deposit untuk <span className="font-medium text-foreground">{createdDeposit?.name}</span> sebesar{" "}
              <span className="font-medium text-foreground">{formatCurrency(createdDeposit?.amount ?? "0")}</span> berhasil dibuat.
            </p>
            <p className="text-muted-foreground mt-2">Lanjut catat pembayaran sekarang?</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreatedDeposit(null)}>Nanti</Button>
            <Button onClick={() => { const d = createdDeposit!; setCreatedDeposit(null); navigate(`/deposits/${d.id}/pay?date=${d.date}`); }}>
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Catat Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────
function DepositCard({ deposit, canDelete, onDelete }: {
  deposit:   Deposit;
  canDelete: boolean;
  onDelete:  () => void;
}) {
  const deletable = canDelete && deposit.status === "UNPAID";
  return (
    <div className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate">{deposit.customer?.name ?? "—"}</p>
            {deposit.customer?.mobilePhone && (
              <p className="text-xs text-slate-400 mt-0.5">{deposit.customer.mobilePhone}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`text-xs rounded-lg px-2 py-0.5 font-medium shrink-0 ${STATUS_BADGE[deposit.status] ?? ""}`}
          >
            {STATUS_LABEL[deposit.status] ?? deposit.status}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
          <span className="font-semibold text-slate-800">{formatCurrency(deposit.amount)}</span>
          {Number(deposit.remainingAmount) > 0 && (
            <span className="text-xs font-medium text-emerald-600">
              Sisa {formatCurrency(deposit.remainingAmount)}
            </span>
          )}
          <span className="text-xs text-slate-400">{formatDate(deposit.createdAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <Link
          to={`/deposits/${deposit.id}`}
          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Lihat detail"
        >
          <Eye className="h-4 w-4" />
        </Link>
        {deletable && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Hapus deposit"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────
function DepositRow({ deposit, canDelete, onDelete }: {
  deposit:   Deposit;
  canDelete: boolean;
  onDelete:  () => void;
}) {
  const deletable = canDelete && deposit.status === "UNPAID";
  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
      <td className="px-5 py-4">
        <p className="font-medium text-slate-800">{deposit.customer?.name ?? "—"}</p>
        <p className="text-xs text-slate-400 mt-0.5">{deposit.customer?.mobilePhone ?? ""}</p>
      </td>
      <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
        {formatDate(deposit.createdAt)}
      </td>
      <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
        {formatCurrency(deposit.amount)}
      </td>
      <td className="px-5 py-4 text-right text-slate-400 text-sm whitespace-nowrap">
        {Number(deposit.usedAmount) > 0 ? formatCurrency(deposit.usedAmount) : "—"}
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        {Number(deposit.remainingAmount) > 0
          ? <span className="font-semibold text-emerald-600">{formatCurrency(deposit.remainingAmount)}</span>
          : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-5 py-4">
        <Badge
          variant="outline"
          className={`text-xs rounded-lg px-2 py-0.5 font-medium ${STATUS_BADGE[deposit.status] ?? ""}`}
        >
          {STATUS_LABEL[deposit.status] ?? deposit.status}
        </Badge>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          <Link
            to={`/deposits/${deposit.id}`}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Lihat detail"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {deletable && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Hapus deposit"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────
function CreateDepositDialog({
  open, onOpenChange, onSubmit, isPending,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:     (customerId: string, customerName: string, amount: number, notes: string, payDate: string) => Promise<void>;
  isPending:    boolean;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [custSearch, setCustSearch]     = useState("");
  const [custResults, setCustResults]   = useState<{ id: string; name: string; mobilePhone: string | null }[]>([]);
  const [selectedCust, setSelectedCust] = useState<{ id: string; name: string } | null>(null);
  const [amount, setAmount]             = useState("");
  const [payDate, setPayDate]           = useState(todayStr);
  const [notes, setNotes]               = useState("");
  const [error, setError]               = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function reset() {
    setCustSearch(""); setCustResults([]); setSelectedCust(null);
    setAmount(""); setPayDate(todayStr); setNotes(""); setError(null);
  }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  function handleCustSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value; setCustSearch(q); setSelectedCust(null);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setCustResults([]); return; }
    timerRef.current = setTimeout(async () => {
      const res = await fetchCustomers({ search: q, limit: 8 });
      setCustResults((res.data as unknown as typeof custResults) ?? []);
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCust) { setError("Pilih customer"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Jumlah harus > 0"); return; }
    setError(null);
    try { await onSubmit(selectedCust.id, selectedCust.name, amt, notes, payDate); reset(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Gagal membuat deposit"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl sm:rounded-2xl">
        <DialogHeader><DialogTitle>Tambah Deposit</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={selectedCust ? selectedCust.name : custSearch}
                onChange={handleCustSearch}
                onClick={() => { if (selectedCust) { setSelectedCust(null); setCustSearch(""); } }}
                placeholder="Cari customer..."
                className="pl-8 rounded-xl border-slate-200 shadow-sm"
              />
            </div>
            {!selectedCust && custResults.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white shadow-lg">
                {custResults.map((c) => (
                  <button key={c.id} type="button"
                    onClick={() => { setSelectedCust(c); setCustSearch(""); setCustResults([]); }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl transition-colors">
                    <span className="font-medium">{c.name}</span>
                    {c.mobilePhone && <span className="ml-2 text-xs text-slate-400">{c.mobilePhone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Jumlah *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                <Input
                  className="pl-8 rounded-xl border-slate-200 shadow-sm"
                  value={amount ? Number(amount).toLocaleString("id-ID") : ""}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal *</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="rounded-xl border-slate-200 shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-shadow focus:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="flex-1 sm:flex-none">Batal</Button>
            <Button type="submit" disabled={isPending} className="flex-1 sm:flex-none">
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
