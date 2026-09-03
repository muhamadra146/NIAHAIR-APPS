import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchJobAssignmentInvoices,
  type JobAssignmentInvoice,
} from "@/features/invoice/api/commissionGenerate.api";
import { RefreshCw, Edit2, Trash2, Loader2, CheckSquare, Calculator, CheckCircle2, ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { toast } from "@/lib/toast";
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
import { CommissionSettingsTab } from "@/features/settings/components/commission/CommissionSettingsTab";
import {
  useCommissions,
  useApproveCommission,
  usePayCommission,
  useOverrideCommission,
  useRegenerateCommission,
  useDeleteCommission,
} from "../hooks";
import { approveCommission } from "../api";
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

// ── Approval Tab ──────────────────────────────────────────────────────

// Helper: apakah invoice sudah ada job assignment tapi belum ada komisi
function isReadyToCalculate(inv: JobAssignmentInvoice): boolean {
  if (inv._count.commissions > 0) return false;
  return inv.treatmentSessions.some((s) =>
    s.treatmentItems.some((ti) =>
      ti.jobAssignments.some(
        (ja) => ja.commissionJobId !== null && ja.employeeId !== null,
      ),
    ),
  );
}

function ApprovalTab() {
  const { branchId } = useAuthStore();
  const qc           = useQueryClient();

  const [startDate, setStart] = useState("");
  const [endDate,   setEnd]   = useState("");
  const [approvingSet, setApprovingSet] = useState<Set<string>>(new Set());

  // Fetch PENDING commissions (sudah kalkulasi)
  const { data, isLoading, isFetching, refetch } = useCommissions({
    status:    "PENDING",
    limit:     500,
    branchId:  branchId  || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });

  // Fetch job-assignment invoices (untuk deteksi "Siap Kalkulasi")
  const { data: jaInvoices = [], isLoading: jaLoading } = useQuery({
    queryKey: ["job-assignment-invoices", startDate, endDate, branchId],
    queryFn:  () => fetchJobAssignmentInvoices({
      startDate: startDate || undefined,
      endDate:   endDate   || undefined,
    }),
    staleTime: 0,
  });

  // Invoice yang sudah diisi pengerjaan tapi belum dijalankan kalkulator
  const readyToCalc = useMemo(
    () => jaInvoices.filter(isReadyToCalculate),
    [jaInvoices],
  );

  const allCommissions = data?.data ?? [];

  // Group by invoiceId
  const groups = useMemo(() => {
    const map = new Map<string, Commission[]>();
    allCommissions.forEach((c) => {
      if (!map.has(c.invoiceId)) map.set(c.invoiceId, []);
      map.get(c.invoiceId)!.push(c);
    });
    return Array.from(map.entries()).map(([invoiceId, items]) => ({
      invoiceId,
      items,
      total: items.reduce((sum, c) => sum + Number(c.commissionAmount), 0),
    }));
  }, [allCommissions]);

  async function handleApprove(ids: string[]) {
    setApprovingSet(new Set(ids));
    let success = 0;
    let failed  = 0;
    for (const id of ids) {
      try {
        await approveCommission(id);
        success++;
      } catch {
        failed++;
      }
    }
    setApprovingSet(new Set());
    void qc.invalidateQueries({ queryKey: ["commissions"] });
    if (failed === 0) {
      toast.success(`${success} komisi disetujui`);
    } else {
      toast.error(`${success} berhasil, ${failed} gagal`);
    }
  }

  const totalPending = allCommissions.length;
  const isApproving  = approvingSet.size > 0;
  const anyLoading   = isLoading || jaLoading;

  return (
    <div className="space-y-5">
      {/* ── Filter + bulk button ───────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date range */}
        <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-xs text-muted-foreground shrink-0">Dari</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStart(e.target.value)}
              className="text-sm bg-transparent focus:outline-none"
            />
          </div>
          <span className="text-muted-foreground text-xs px-1 select-none border-x border-input bg-muted/30 py-2">
            s/d
          </span>
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEnd(e.target.value)}
              className="text-sm bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => void refetch()}
            disabled={anyLoading || isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {totalPending > 0 && (
            <Button
              size="sm"
              disabled={isApproving}
              onClick={() => void handleApprove(allCommissions.map((c) => c.id))}
            >
              {isApproving ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Menyetujui...</>
              ) : (
                <><CheckSquare className="mr-1.5 h-3.5 w-3.5" />Setujui Semua ({totalPending})</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────── */}
      {anyLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Siap Kalkulasi ─────────────────────────────────────── */}
      {!anyLoading && readyToCalc.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Siap Kalkulasi
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-100 px-1.5 py-0 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              {readyToCalc.length}
            </span>
          </div>
          {readyToCalc.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 px-5 py-3.5"
            >
              <div>
                <p className="font-semibold text-sm">{inv.invoiceNo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inv.customer.name} · {formatDate(inv.invoiceDate)} · {formatCurrency(inv.grandTotal)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/generate-komisi/${inv.id}/calculator`}>
                  <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                    <Calculator className="h-3.5 w-3.5" />
                    Kalkulasi
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="Jalankan kalkulasi dulu sebelum menyetujui"
                  className="gap-1.5 opacity-40 cursor-not-allowed"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Setujui
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Menunggu Approval ──────────────────────────────────── */}
      {!anyLoading && groups.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
            Menunggu Approval
          </span>
          <span className="rounded-full border border-purple-200 bg-purple-100 px-1.5 py-0 text-[11px] font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            {groups.length}
          </span>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {!anyLoading && readyToCalc.length === 0 && groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-medium">Semua bersih</p>
          <p className="text-sm">Tidak ada invoice yang perlu diproses</p>
        </div>
      )}

      {/* ── Invoice groups (PENDING commissions) ─────────────── */}
      {groups.map((group) => {
        const groupApproving = group.items.some((c) => approvingSet.has(c.id));
        return (
          <div
            key={group.invoiceId}
            className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
          >
            {/* Group header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-muted/30 border-b border-border">
              <div>
                <p className="font-semibold tabular-nums">
                  #{group.invoiceId.slice(-8).toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {group.items.length} komisi · Total{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(group.total)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/generate-komisi/${group.invoiceId}/calculator`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Calculator className="h-3.5 w-3.5" />
                    Kalkulator
                  </Button>
                </Link>
                <Button
                  size="sm"
                  disabled={groupApproving || isApproving}
                  onClick={() => void handleApprove(group.items.map((c) => c.id))}
                >
                  {groupApproving
                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Menyetujui...</>
                    : "Setujui"
                  }
                </Button>
              </div>
            </div>

            {/* Commission rows per employee */}
            <div className="divide-y divide-border">
              {group.items.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.employee?.name ?? "—"}</p>
                    {c.employee?.employeeCode && (
                      <p className="text-xs text-muted-foreground">{c.employee.employeeCode}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.isManualOverride && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-purple-50 text-purple-700 border-purple-200"
                      >
                        manual
                      </Badge>
                    )}
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(c.commissionAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

interface OverrideTarget { id: string; currentAmount: number; }

export function CommissionListPage() {
  const { user, branchId } = useAuthStore();
  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";

  const [activeTab, setActiveTab] = useState<"commissions" | "approval" | "items" | "settings">("commissions");

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

  const [deleteTarget, setDeleteTarget]   = useState<Commission | null>(null);

  // Per-invoice accordion state
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds]          = useState<Set<string>>(new Set());

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

  // Group commissions by invoiceId for per-invoice accordion view
  const invoiceGroups = useMemo(() => {
    const map = new Map<string, Commission[]>();
    commissions.forEach((c) => {
      if (!map.has(c.invoiceId)) map.set(c.invoiceId, []);
      map.get(c.invoiceId)!.push(c);
    });
    return Array.from(map.entries()).map(([invoiceId, items]) => {
      const first = items[0];
      return {
        invoiceId,
        invoiceNo:       first.invoice?.invoiceNo   ?? `…${invoiceId.slice(-8).toUpperCase()}`,
        invoiceDate:     first.invoice?.invoiceDate ?? first.createdAt,
        customer:        first.invoice?.customer?.name ?? "—",
        grandTotal:      first.invoice?.grandTotal ?? null,
        items,
        totalCommission: items.reduce((sum, c) => sum + Number(c.commissionAmount), 0),
      };
    });
  }, [commissions]);

  const allExpanded = invoiceGroups.length > 0 && invoiceGroups.every((g) => expandedInvoices.has(g.invoiceId));

  function toggleInvoice(id: string) {
    setExpandedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedInvoices(new Set());
    } else {
      setExpandedInvoices(new Set(invoiceGroups.map((g) => g.invoiceId)));
    }
  }

  const qc = useQueryClient();
  async function handleGroupApprove(ids: string[]) {
    setApprovingIds(new Set(ids));
    let success = 0, failed = 0;
    for (const id of ids) {
      try { await approveCommission(id); success++; }
      catch { failed++; }
    }
    setApprovingIds(new Set());
    void qc.invalidateQueries({ queryKey: ["commissions"] });
    if (failed === 0) toast.success(`${success} komisi disetujui`);
    else toast.error(`${success} berhasil, ${failed} gagal`);
  }

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
            { key: "commissions", label: "Komisi"      },
            { key: "approval",    label: "Approval"    },
            { key: "items",       label: "Master Item"  },
            { key: "settings",    label: "Pengaturan"   },
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

        {activeTab === "items"    && <MasterItemTab />}
        {activeTab === "settings" && <CommissionSettingsTab />}
        {activeTab === "approval" && <ApprovalTab />}
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
              {/* Expand / Collapse all */}
              {invoiceGroups.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                  className="h-9 gap-1.5 text-xs text-muted-foreground ml-auto"
                >
                  {allExpanded
                    ? <><ChevronsUpDown className="h-3.5 w-3.5" />Tutup Semua</>
                    : <><ChevronsDownUp className="h-3.5 w-3.5" />Buka Semua</>
                  }
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0 divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : invoiceGroups.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-400">Tidak ada komisi.</p>
            ) : (
              <div className="divide-y divide-border">
                {invoiceGroups.map((group) => (
                  <InvoiceGroupRow
                    key={group.invoiceId}
                    group={group}
                    expanded={expandedInvoices.has(group.invoiceId)}
                    onToggle={() => toggleInvoice(group.invoiceId)}
                    isSuperAdmin={isSuperAdmin}
                    approvingIds={approvingIds}
                    onGroupApprove={(ids) => void handleGroupApprove(ids)}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onPay={(id) => payMutation.mutate(id)}
                    onOverride={openOverride}
                    onDelete={(c) => setDeleteTarget(c)}
                    approving={approveMutation.isPending}
                    paying={payMutation.isPending}
                  />
                ))}
              </div>
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

// ── Per-invoice group type ────────────────────────────────────────────

interface InvoiceGroup {
  invoiceId:       string;
  invoiceNo:       string;
  invoiceDate:     string;
  customer:        string;
  grandTotal:      string | null;
  items:           Commission[];
  totalCommission: number;
}

interface InvoiceGroupRowProps {
  group:          InvoiceGroup;
  expanded:       boolean;
  onToggle:       () => void;
  isSuperAdmin:   boolean;
  approvingIds:   Set<string>;
  onGroupApprove: (ids: string[]) => void;
  onApprove:      (id: string) => void;
  onPay:          (id: string) => void;
  onOverride:     (c: Commission) => void;
  onDelete:       (c: Commission) => void;
  approving:      boolean;
  paying:         boolean;
}

function GroupStatusBadge({ items }: { items: Commission[] }) {
  const counts = items.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const entries = Object.entries(counts);
  if (entries.length === 1) {
    const [s] = entries[0];
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[s] ?? ""}`}>
        {STATUS_LABEL[s] ?? s}
      </Badge>
    );
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {entries.map(([s, n]) => (
        <Badge key={s} variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[s] ?? ""}`}>
          {n} {STATUS_LABEL[s] ?? s}
        </Badge>
      ))}
    </div>
  );
}

function InvoiceGroupRow({
  group, expanded, onToggle, isSuperAdmin,
  approvingIds, onGroupApprove,
  onApprove, onPay, onOverride, onDelete,
  approving, paying,
}: InvoiceGroupRowProps) {
  const pendingItems    = group.items.filter((c) => c.status === "PENDING");
  const isGroupApproving = pendingItems.some((c) => approvingIds.has(c.id));

  return (
    <div>
      {/* Invoice header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`}
        />

        {/* Invoice info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-sm">{group.invoiceNo}</span>
            <span className="text-xs text-muted-foreground">{group.customer}</span>
            <span className="text-xs text-muted-foreground">{formatDate(group.invoiceDate)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{group.items.length} komisi</span>
            <GroupStatusBadge items={group.items} />
          </div>
        </div>

        {/* Right side: total + approve button */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold tabular-nums">{formatCurrency(group.totalCommission)}</span>
          {isSuperAdmin && pendingItems.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={isGroupApproving || approving}
              onClick={(e) => { e.stopPropagation(); onGroupApprove(pendingItems.map((c) => c.id)); }}
            >
              {isGroupApproving
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <>Setujui{pendingItems.length > 1 ? ` (${pendingItems.length})` : ""}</>
              }
            </Button>
          )}
        </div>
      </button>

      {/* Expanded: per-employee commission rows */}
      {expanded && (
        <div className="border-t border-border/60 bg-muted/5">
          {group.items.map((c, i) => (
            <div
              key={c.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 pl-12 pr-5 py-3 ${
                i < group.items.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              {/* Employee */}
              <div className="flex-1 min-w-[120px]">
                <span className="text-sm font-medium">{c.employee?.name ?? "—"}</span>
                {c.employee?.employeeCode && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{c.employee.employeeCode}</span>
                )}
              </div>

              {/* Rate */}
              <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                {c.commissionType === "PERCENTAGE"
                  ? `${Number(c.commissionValue)}%`
                  : formatCurrency(c.commissionValue)}
              </span>

              {/* Amount */}
              <span className="text-sm font-semibold tabular-nums w-28 text-right">
                {formatCurrency(c.commissionAmount)}
              </span>

              {/* Status badges */}
              <CommissionStatusBadges commission={c} />

              {/* Actions */}
              {isSuperAdmin && (
                <ActionButtons
                  status={c.status}
                  onApprove={() => onApprove(c.id)}
                  onPay={() => onPay(c.id)}
                  onOverride={() => onOverride(c)}
                  onDelete={() => onDelete(c)}
                  approving={approving}
                  paying={paying}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
