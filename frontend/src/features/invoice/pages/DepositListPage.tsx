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
import { useDeposits, useCreateDeposit, useDeleteDeposit } from "../hooks";
import type { DepositStatus, Deposit } from "../types";

const ALL_STATUSES: DepositStatus[] = ["UNPAID", "PAID", "PARTIAL_USED", "USED"];

const STATUS_LABEL: Record<string, string> = {
  UNPAID:       "Belum Dibayar",
  PAID:         "Aktif",
  PARTIAL_USED: "Sebagian Terpakai",
  USED:         "Habis",
};

const STATUS_COLOR: Record<string, string> = {
  UNPAID:       "text-yellow-600 border-yellow-300",
  PAID:         "text-green-600 border-green-300",
  PARTIAL_USED: "text-blue-600 border-blue-300",
  USED:         "text-muted-foreground",
};

const CAN_DELETE: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

export function DepositListPage() {
  const { branchId, user } = useAuthStore();
  const navigate = useNavigate();
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState<string>("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [custSearch, setCustSearch]   = useState("");
  const [custResults, setCustResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedCust, setSelectedCust] = useState<{ id: string; name: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Deposit | null>(null);
  const filterTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Post-create dialog state
  const [createdDeposit, setCreatedDeposit] = useState<{ id: string; name: string; amount: string; date: string } | null>(null);

  const deleteMutation = useDeleteDeposit();
  const canDelete = user ? CAN_DELETE.includes(user.roleCode) : false;

  const { data, isLoading } = useDeposits({
    page, limit: 20,
    branchId:   branchId              || undefined,
    status:     status                || undefined,
    startDate:  startDate             || undefined,
    endDate:    endDate               || undefined,
    customerId: selectedCust?.id      || undefined,
  });

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
    setSelectedCust(null);
    setCustSearch("");
    setCustResults([]);
    setPage(1);
  }
  const createMutation = useCreateDeposit();

  const deposits   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Deposit</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} deposit` : "Kelola deposit customer"}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm" disabled={!branchId}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Deposit
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex flex-wrap gap-3">
              {/* Customer search */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Customer</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={selectedCust ? selectedCust.name : custSearch}
                    onChange={handleCustSearch}
                    onClick={() => { if (selectedCust) clearCust(); }}
                    placeholder="Cari customer..."
                    className="h-9 pl-8 w-44"
                  />
                  {!selectedCust && custResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-input bg-background shadow-md">
                      {custResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedCust(c); setCustSearch(""); setCustResults([]); setPage(1); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Semua</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="h-9 w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="h-9 w-36" />
              </div>

              {(selectedCust || status || startDate || endDate) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { clearCust(); setStatus(""); setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs">Reset</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : deposits.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada deposit.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Jumlah</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Terpakai</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sisa</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d) => (
                      <DepositRow key={d.id} deposit={d} canDelete={canDelete} onDelete={() => setDeleteTarget(d)} />
                    ))}
                  </tbody>
                </table>
              </div>
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

      <CreateDepositDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (customerId, customerName, amount, notes, payDate) => {
          const result = await createMutation.mutateAsync({ customerId, amount, notes: notes || undefined });
          setFormOpen(false);
          setCreatedDeposit({
            id:     (result as Deposit).id,
            name:   customerName,
            amount: String(amount),
            date:   payDate,
          });
        }}
        isPending={createMutation.isPending}
      />

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Deposit</DialogTitle>
          </DialogHeader>
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

      {/* Post-create: lanjut ke pembayaran? */}
      <Dialog open={!!createdDeposit} onOpenChange={(v) => { if (!v) setCreatedDeposit(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deposit Berhasil Dibuat</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1 text-sm">
            <p className="text-muted-foreground">
              Deposit untuk <span className="font-medium text-foreground">{createdDeposit?.name}</span> sebesar{" "}
              <span className="font-medium text-foreground">{formatCurrency(createdDeposit?.amount ?? "0")}</span> berhasil dibuat.
            </p>
            <p className="text-muted-foreground mt-2">Lanjut catat pembayaran sekarang?</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreatedDeposit(null)}>
              Nanti
            </Button>
            <Button
              onClick={() => {
                const d = createdDeposit!;
                setCreatedDeposit(null);
                navigate(`/deposits/${d.id}/pay?date=${d.date}`);
              }}
            >
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Catat Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function DepositRow({ deposit, canDelete, onDelete }: {
  deposit:   import("../types").Deposit;
  canDelete: boolean;
  onDelete:  () => void;
}) {
  const statusLabel = STATUS_LABEL[deposit.status];
  const statusColor = STATUS_COLOR[deposit.status];
  const deletable   = canDelete && deposit.status === "UNPAID";

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <p className="font-medium">{deposit.customer?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{deposit.customer?.mobilePhone ?? ""}</p>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(deposit.createdAt)}</td>
      <td className="px-4 py-3 text-right font-medium">{formatCurrency(deposit.amount)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {Number(deposit.usedAmount) > 0 ? formatCurrency(deposit.usedAmount) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {Number(deposit.remainingAmount) > 0
          ? <span className="font-medium text-green-700">{formatCurrency(deposit.remainingAmount)}</span>
          : "—"}
      </td>
      <td className="px-4 py-3">
        {statusLabel ? (
          <Badge variant="outline" className={`text-xs ${statusColor}`}>
            {statusLabel}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{deposit.status}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link
            to={`/deposits/${deposit.id}`}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Lihat detail"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {deletable && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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

function CreateDepositDialog({
  open, onOpenChange, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (customerId: string, customerName: string, amount: number, notes: string, payDate: string) => Promise<void>;
  isPending: boolean;
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

  function formatAmountDisplay(raw: string) {
    const num = raw.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  }
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAmount(e.target.value.replace(/\D/g, ""));
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Deposit</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Customer */}
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={selectedCust ? selectedCust.name : custSearch} onChange={handleCustSearch}
                onClick={() => { if (selectedCust) { setSelectedCust(null); setCustSearch(""); } }}
                placeholder="Cari customer..." className="pl-8" />
            </div>
            {!selectedCust && custResults.length > 0 && (
              <div className="rounded-md border border-input bg-background shadow-sm">
                {custResults.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setSelectedCust(c); setCustSearch(""); setCustResults([]); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <span className="font-medium">{c.name}</span>
                    {c.mobilePhone && <span className="ml-2 text-xs text-muted-foreground">{c.mobilePhone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount + Date side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Jumlah *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  className="pl-8"
                  value={formatAmountDisplay(amount)}
                  onChange={handleAmountChange}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal *</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
