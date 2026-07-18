import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, BadgeDollarSign } from "lucide-react";
import { PageContainer }   from "@/components/layout/PageContainer";
import { Badge }           from "@/components/ui/badge";
import { Button }          from "@/components/ui/button";
import { Skeleton }        from "@/components/ui/skeleton";
import { useAuthStore }    from "@/stores/authStore";
import { useCommissions }  from "../hooks";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CommissionStatus } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

const STATUS_CFG: Record<CommissionStatus, { label: string; cls: string }> = {
  PENDING:  { label: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200"   },
  APPROVED: { label: "Disetujui",  cls: "bg-blue-50 text-blue-700 border-blue-200"      },
  PAID:     { label: "Dibayar",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function StatusBadge({ status }: { status: CommissionStatus }) {
  const { label, cls } = STATUS_CFG[status];
  return <Badge variant="outline" className={`text-xs rounded-lg ${cls}`}>{label}</Badge>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MyCommissionPage() {
  const { user, branchId } = useAuthStore();
  const employeeId = user?.employeeId ?? "";

  const [page, setPage]     = useState(1);
  const [startDate, setStart] = useState("");
  const [endDate, setEnd]     = useState("");
  const [status, setStatus]   = useState<CommissionStatus | "">("");

  const { data, isLoading } = useCommissions({
    page,
    limit:      20,
    employeeId: employeeId || undefined,
    branchId:   branchId   || undefined,
    startDate:  startDate  || undefined,
    endDate:    endDate    || undefined,
    status:     status     || undefined,
  });

  const commissions = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 20) : 1;
  const hasFilter   = !!(startDate || endDate || status);

  // ── Summary totals from current page ─────────────────────────────────────
  // For accurate totals across ALL pages, we fetch a separate summary-all query
  const { data: allData } = useCommissions({
    limit:      1000,
    employeeId: employeeId || undefined,
    branchId:   branchId   || undefined,
    startDate:  startDate  || undefined,
    endDate:    endDate    || undefined,
    status:     status     || undefined,
  });
  const allItems    = allData?.data ?? [];
  const totalAmount = allItems.reduce((s, c) => s + Number(c.commissionAmount), 0);
  const paidAmount  = allItems.filter(c => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const pendingAmt  = allItems.filter(c => c.status === "PENDING").reduce((s, c) => s + Number(c.commissionAmount), 0);

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Komisi Saya</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} komisi` : "Riwayat komisi kamu"}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-slate-400" />
              <p className="text-xs font-medium text-slate-500">Total</p>
            </div>
            <p className="text-base font-bold tabular-nums text-slate-800">{formatCurrency(totalAmount)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{allItems.length} item</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
              <p className="text-xs font-medium text-slate-500">Dibayar</p>
            </div>
            <p className="text-base font-bold tabular-nums text-emerald-700">{formatCurrency(paidAmount)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{allItems.filter(c => c.status === "PAID").length} item</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-amber-400" />
              <p className="text-xs font-medium text-slate-500">Pending</p>
            </div>
            <p className="text-base font-bold tabular-nums text-amber-700">{formatCurrency(pendingAmt)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{allItems.filter(c => c.status === "PENDING").length} item</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Status</p>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as CommissionStatus | ""); setPage(1); }}
              className={`${filterInputCls} px-3 text-sm w-36`}
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Disetujui</option>
              <option value="PAID">Dibayar</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Periode</p>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStart(e.target.value); setPage(1); }}
                className="h-9 bg-transparent px-3 text-sm focus:outline-none"
              />
              <span className="text-muted-foreground text-xs px-1 select-none border-x border-slate-200 bg-slate-50 py-2">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEnd(e.target.value); setPage(1); }}
                className="h-9 bg-transparent px-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          {hasFilter && (
            <Button
              variant="ghost" size="sm"
              onClick={() => { setStatus(""); setStart(""); setEnd(""); setPage(1); }}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              Reset Filter
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36 flex-1" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : commissions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center gap-3">
              <BadgeDollarSign className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">Belum ada komisi</p>
              <p className="text-xs text-slate-400">Komisi akan muncul setelah invoice selesai diproses</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {commissions.map((c) => (
                  <div key={c.id} className="px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 font-mono">{c.invoiceId.slice(-8).toUpperCase()}</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDate(c.createdAt)}</p>
                      <div className="mt-1.5"><StatusBadge status={c.status} /></div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-emerald-700">{formatCurrency(c.commissionAmount)}</p>
                      {c.paidAt && <p className="text-xs text-slate-400 mt-0.5">Dibayar {formatDate(c.paidAt)}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Komisi</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dibayar</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.map((c) => (
                      <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/invoices/${c.invoiceId}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {c.invoiceId.slice(-10).toUpperCase()}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                        <td className="px-5 py-3.5 text-right font-bold tabular-nums text-emerald-700 whitespace-nowrap">
                          {formatCurrency(c.commissionAmount)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {c.paidAt ? formatDate(c.paidAt) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/invoices/${c.invoiceId}`}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                          >
                            Lihat <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
