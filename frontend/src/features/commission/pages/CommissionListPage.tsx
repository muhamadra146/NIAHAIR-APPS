import { useState } from "react";
import { RefreshCw, Edit2, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MasterItemTab } from "../components/MasterItemTab";
import {
  useCommissions,
  useApproveCommission,
  usePayCommission,
  useOverrideCommission,
  useRegenerateCommission,
  useDeleteCommission,
} from "../hooks";
import type { Commission, CommissionStatus } from "../types";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "",         label: "Semua" },
  { key: "PENDING",  label: "Pending" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "PAID",     label: "Dibayar" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING:  "Pending",
  APPROVED: "Disetujui",
  PAID:     "Dibayar",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  PAID:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

interface OverrideTarget { id: string; currentAmount: number; }

export function CommissionListPage() {
  const { user, branchId } = useAuthStore();
  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";

  const [activeTab, setActiveTab] = useState<"commissions" | "items">("commissions");

  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const [overrideTarget, setOverrideTarget] = useState<OverrideTarget | null>(null);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideNotes, setOverrideNotes]   = useState("");

  const { data, isLoading } = useCommissions({
    page, limit: 20,
    branchId:  branchId  || undefined,
    status:    status    || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
    invoiceId: invoiceId || undefined,
  });

  const approveMutation    = useApproveCommission();
  const payMutation        = usePayCommission();
  const overrideMutation   = useOverrideCommission();
  const regenerateMutation = useRegenerateCommission();
  const deleteMutation     = useDeleteCommission();

  const [deleteTarget, setDeleteTarget] = useState<Commission | null>(null);

  const commissions = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 20) : 1;

  const counts = commissions.reduce(
    (acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const totalAmount = commissions.reduce(
    (sum, c) => sum + Number(c.commissionAmount), 0,
  );

  function openOverride(c: Commission) {
    setOverrideTarget({ id: c.id, currentAmount: Number(c.commissionAmount) });
    setOverrideAmount(String(Number(c.commissionAmount)));
    setOverrideNotes("");
  }

  function submitOverride() {
    if (!overrideTarget) return;
    const amount = parseFloat(overrideAmount);
    if (isNaN(amount) || amount < 0) return;
    overrideMutation.mutate(
      { id: overrideTarget.id, body: { commissionAmount: amount, notes: overrideNotes || undefined } },
      { onSuccess: () => setOverrideTarget(null) },
    );
  }

  return (
    <PageContainer>
      <div className="space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Komisi</h1>
            <p className="text-sm text-muted-foreground">Kelola komisi karyawan</p>
          </div>
        </div>

        {/* Page tabs */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: "commissions", label: "Komisi" },
            { key: "items",       label: "Master Item" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "items" && <MasterItemTab />}
        {activeTab === "commissions" && (<>

        {/* Summary bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Ditampilkan" value={String(commissions.length)}         accent="text-foreground" />
          <SummaryCard label="Pending"     value={String(counts["PENDING"] ?? 0)}     accent="text-yellow-600" />
          <SummaryCard label="Disetujui"   value={String(counts["APPROVED"] ?? 0)}    accent="text-blue-600"   />
          <SummaryCard label="Total Komisi" value={formatCurrency(totalAmount)}        accent="text-emerald-600" highlight />
        </div>

        {/* Filter + table */}
        <Card className="rounded-2xl border border-slate-100/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 pt-4">

            {/* Status tabs */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    status === tab.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-background"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date range — grouped */}
              <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-xs text-muted-foreground shrink-0">Dari</span>
                  <input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="text-sm bg-transparent focus:outline-none" />
                </div>
                <span className="text-muted-foreground text-xs px-1 select-none border-x border-input bg-muted/30 py-2">s/d</span>
                <div className="flex items-center gap-2 px-3 py-2">
                  <input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="text-sm bg-transparent focus:outline-none" />
                </div>
              </div>
              <Input
                value={invoiceId}
                onChange={(e) => { setInvoiceId(e.target.value.trim()); setPage(1); }}
                placeholder="Filter invoice…"
                className={`${filterInputCls} w-44 h-[38px]`}
              />
              {isSuperAdmin && invoiceId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs self-end"
                  disabled={regenerateMutation.isPending}
                  onClick={() => regenerateMutation.mutate(invoiceId)}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
                  {regenerateMutation.isPending ? "…" : "Regenerate"}
                </Button>
              )}
              {(startDate || endDate || invoiceId) && (
                <Button variant="ghost" size="sm" onClick={() => { setStart(""); setEnd(""); setInvoiceId(""); setPage(1); }} className="h-9 text-xs text-slate-500 hover:text-slate-800 self-end">
                  Reset
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : commissions.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-400">Tidak ada komisi.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Karyawan</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Rate</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Komisi</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tanggal</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        {isSuperAdmin && <th className="px-5 py-3" />}
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <CommissionRow
                          key={c.id}
                          commission={c}
                          isSuperAdmin={isSuperAdmin}
                          onApprove={() => approveMutation.mutate(c.id)}
                          onPay={() => payMutation.mutate(c.id)}
                          onOverride={() => openOverride(c)}
                          onDelete={() => setDeleteTarget(c)}
                          approving={approveMutation.isPending}
                          paying={payMutation.isPending}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {commissions.map((c) => (
                    <CommissionCard
                      key={c.id}
                      commission={c}
                      isSuperAdmin={isSuperAdmin}
                      onApprove={() => approveMutation.mutate(c.id)}
                      onPay={() => payMutation.mutate(c.id)}
                      onOverride={() => openOverride(c)}
                      approving={approveMutation.isPending}
                      paying={payMutation.isPending}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
        </>)}
      </div>

      {/* Override dialog */}
      <Dialog open={!!overrideTarget} onOpenChange={(open) => { if (!open) setOverrideTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Komisi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nominal Komisi (Rp)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Catatan (opsional)</Label>
              <Input
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Alasan perubahan…"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOverrideTarget(null)}>Batal</Button>
            <Button
              size="sm"
              disabled={overrideMutation.isPending || overrideAmount === ""}
              onClick={submitOverride}
            >
              {overrideMutation.isPending ? "…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-4 w-4" /> Hapus Komisi
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="py-1 space-y-1 text-sm text-slate-600">
              <p>Semua komisi untuk invoice ini akan dihapus dan status akan kembali ke <strong>belum generate</strong>.</p>
              <div className="mt-3 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 space-y-1">
                <p><span className="text-slate-400">Invoice:</span> <span className="font-mono text-xs">…{deleteTarget.invoiceId.slice(-8).toUpperCase()}</span></p>
                <p><span className="text-slate-400">Karyawan (dipilih):</span> <strong>{deleteTarget.employee?.name ?? "—"}</strong></p>
                <p><span className="text-slate-400">Status komisi:</span> <strong>{STATUS_LABEL[deleteTarget.status] ?? deleteTarget.status}</strong></p>
              </div>
              <p className="text-xs text-rose-600 mt-2 font-medium">⚠ Seluruh komisi invoice ini akan dihapus, bukan hanya komisi yang dipilih. Aksi ini tidak bisa dibatalkan.</p>
              {deleteTarget.status === "PAID" && (
                <p className="text-xs text-rose-500 mt-1">Catatan: pembayaran payroll yang sudah dilakukan tidak ikut terbalik.</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
                }
              }}
            >
              {deleteMutation.isPending ? "Menghapus…" : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function SummaryCard({
  label, value, accent, highlight,
}: {
  label: string;
  value: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? "bg-muted/30 border-border" : "bg-background border-border"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

interface CommissionActionProps {
  commission:  Commission;
  isSuperAdmin: boolean;
  onApprove:   () => void;
  onPay:       () => void;
  onOverride:  () => void;
  onDelete:    () => void;
  approving:   boolean;
  paying:      boolean;
}

function CommissionStatusBadges({ commission: c }: { commission: Commission }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <Badge
        variant="outline"
        className={`text-xs rounded-lg px-2 py-0.5 font-medium ${STATUS_BADGE[c.status] ?? ""}`}
      >
        {STATUS_LABEL[c.status] ?? c.status}
      </Badge>
      {c.isForfeit && (
        <Badge variant="outline" className="text-xs rounded-lg px-2 py-0.5 font-medium bg-red-50 text-red-700 border-red-200">
          Hangus
        </Badge>
      )}
      {c.isManualOverride && (
        <Badge variant="outline" className="text-xs rounded-lg px-2 py-0.5 font-medium bg-purple-50 text-purple-700 border-purple-200">
          Manual
        </Badge>
      )}
    </div>
  );
}

function CommissionRow({ commission: c, isSuperAdmin, onApprove, onPay, onOverride, onDelete, approving, paying }: CommissionActionProps) {
  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
      <td className="px-5 py-4">
        <p className="font-medium text-slate-800">{c.employee?.name ?? "—"}</p>
        {c.employee?.employeeCode && (
          <p className="text-xs text-slate-400 mt-0.5">{c.employee.employeeCode}</p>
        )}
      </td>
      <td className="px-5 py-4 font-mono text-xs text-slate-400">{c.invoiceId.slice(-8).toUpperCase()}</td>
      <td className="px-5 py-4">
        <span className="text-xs text-slate-500">
          {c.commissionType === "PERCENTAGE"
            ? `${Number(c.commissionValue)}%`
            : formatCurrency(c.commissionValue)}
        </span>
      </td>
      <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
        {formatCurrency(c.commissionAmount)}
      </td>
      <td className="px-5 py-4 text-sm text-slate-500">{formatDate(c.createdAt)}</td>
      <td className="px-5 py-4">
        <CommissionStatusBadges commission={c} />
      </td>
      {isSuperAdmin && (
        <td className="px-5 py-4">
          <ActionButtons
            status={c.status}
            onApprove={onApprove}
            onPay={onPay}
            onOverride={onOverride}
            onDelete={onDelete}
            approving={approving}
            paying={paying}
          />
        </td>
      )}
    </tr>
  );
}

function CommissionCard({ commission: c, isSuperAdmin, onApprove, onPay, onOverride, onDelete, approving, paying }: CommissionActionProps) {
  return (
    <div className="px-5 py-4 space-y-2 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-slate-800">{c.employee?.name ?? "—"}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Invoice …{c.invoiceId.slice(-8).toUpperCase()}</p>
        </div>
        <CommissionStatusBadges commission={c} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{formatDate(c.createdAt)}</span>
        <span className="font-semibold text-slate-800">{formatCurrency(c.commissionAmount)}</span>
      </div>
      {isSuperAdmin && (
        <div className="flex gap-2 pt-1">
          <ActionButtons
            status={c.status}
            onApprove={onApprove}
            onPay={onPay}
            onOverride={onOverride}
            onDelete={onDelete}
            approving={approving}
            paying={paying}
          />
        </div>
      )}
    </div>
  );
}

function ActionButtons({ status, onApprove, onPay, onOverride, onDelete, approving, paying }: {
  status:    CommissionStatus;
  onApprove: () => void;
  onPay:     () => void;
  onOverride: () => void;
  onDelete:  () => void;
  approving: boolean;
  paying:    boolean;
}) {
  const canOverride = status === "PENDING" || status === "APPROVED";
  return (
    <div className="flex gap-1.5 flex-wrap">
      {status === "PENDING" && (
        <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={onApprove} disabled={approving}>
          {approving ? "…" : "Setujui"}
        </Button>
      )}
      {canOverride && (
        <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs px-2 text-slate-500 hover:text-slate-800" onClick={onOverride}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs px-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
