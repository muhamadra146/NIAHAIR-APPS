import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, BadgeDollarSign, AlertCircle } from "lucide-react";
import { EmptyState }      from "@/components/common/EmptyState";
import { Pagination }      from "@/components/common/Pagination";
import { PageContainer }   from "@/components/layout/PageContainer";
import { Badge }           from "@/components/ui/badge";
import { Button }          from "@/components/ui/button";
import { Skeleton }        from "@/components/ui/skeleton";
import { useMyCommissions, useMyCommissionSummary } from "../hooks";
import { useAuthStore }    from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Commission, CommissionBucket, CommissionStatus } from "../types";
import { StoredCommissionBreakdown } from "../components/CommissionBreakdown";

// ── Helpers ───────────────────────────────────────────────────────────────────

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

// Label mengikuti alur: menunggu persetujuan → siap dibayar (lewat gaji) → sudah dibayar
const STATUS_CFG: Record<CommissionStatus, { label: string; cls: string }> = {
  PENDING:  { label: "Menunggu Persetujuan", cls: "bg-amber-50 text-amber-700 border-amber-200"   },
  APPROVED: { label: "Siap Dibayar",         cls: "bg-blue-50 text-blue-700 border-blue-200"      },
  PAID:     { label: "Sudah Dibayar",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

/** Nama job + item layanan (sistem kategori-job) */
function JobLabel({ commission: c }: { commission: Commission }) {
  const job = c.treatmentJobAssignment?.commissionJob;
  if (!job && !c.serviceItem) return null;
  return (
    <p className="text-xs font-medium text-slate-700">
      {[job?.name, c.serviceItem?.name].filter(Boolean).join(" · ")}
    </p>
  );
}

function StatusBadge({ status }: { status: CommissionStatus }) {
  const { label, cls } = STATUS_CFG[status];
  return <Badge variant="outline" className={`text-xs rounded-lg ${cls}`}>{label}</Badge>;
}

function SummaryCard({ label, bucket, hint, dot, amountCls }: {
  label: string; bucket?: CommissionBucket; hint: string; dot: string; amountCls: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      {bucket ? (
        <p className={`text-base font-bold tabular-nums ${amountCls}`}>{formatCurrency(bucket.amount)}</p>
      ) : (
        <Skeleton className="h-5 w-24" />
      )}
      <p className="mt-0.5 text-xs text-slate-400">{bucket ? `${bucket.count} item · ` : ""}{hint}</p>
    </div>
  );
}

const INVOICE_DETAIL_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"];

const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function MyCommissionPage() {
  const [page, setPage]           = useState(1);
  // "" = periode gaji berjalan (dihitung backend dari tanggal gajian karyawan)
  const [yearMonth, setYearMonth] = useState("");
  const [status, setStatus]       = useState<CommissionStatus | "">("");

  // Ringkasan dihitung di backend — aturan periode sama dengan payroll (tanggal disetujui)
  const { data: summary } = useMyCommissionSummary(yearMonth || undefined);
  const activeYm = yearMonth || summary?.period.yearMonth || "";

  // employeeId diambil backend dari user login (GET /commissions/my)
  const { data, isLoading } = useMyCommissions({
    page,
    limit:     20,
    yearMonth: activeYm || undefined,
    status:    status || undefined,
  }, !!activeYm); // tunggu periode gaji diketahui

  const commissions = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 20) : 1;
  const hasFilter   = !!(yearMonth || status);
  const period      = summary?.period;
  // Halaman detail invoice hanya untuk role POS (lihat router) — staf lain tampil teks saja
  const roleCode       = useAuthStore((s) => s.user?.roleCode) ?? "";
  const canOpenInvoice = INVOICE_DETAIL_ROLES.includes(roleCode);

  return (
    <PageContainer
      title="Komisi Saya"
      subtitle="Komisi masuk slip gaji setelah disetujui Finance"
    >
      <div className="space-y-4 sm:space-y-5">

        {/* Periode gaji */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Gaji Bulan</p>
            <input
              type="month"
              value={activeYm}
              onChange={(e) => { setYearMonth(e.target.value); setPage(1); }}
              className={`${filterInputCls} px-3 text-sm`}
            />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Status</p>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as CommissionStatus | ""); setPage(1); }}
              className={`${filterInputCls} px-3 text-sm w-48`}
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu Persetujuan</option>
              <option value="APPROVED">Siap Dibayar</option>
              <option value="PAID">Sudah Dibayar</option>
            </select>
          </div>
          {hasFilter && (
            <Button
              variant="ghost" size="sm"
              onClick={() => { setStatus(""); setYearMonth(""); setPage(1); }}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              Periode Berjalan
            </Button>
          )}
        </div>

        {period && (
          <p className="text-sm text-slate-600">
            Gaji <span className="font-semibold text-slate-800">{monthLabel(period.yearMonth)}</span>
            {" · "}kerja {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
            {" · "}dibayar {formatDate(period.payDate)}
            {period.payrollStatus === "PAID" && <span className="ml-1 text-emerald-700">(slip gaji sudah dibayar)</span>}
          </p>
        )}

        {/* Summary cards — Menunggu + Siap Dibayar + Sudah Dibayar = Total */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total Komisi"         bucket={summary?.total}   hint="periode ini"          dot="bg-slate-400"   amountCls="text-slate-800" />
          <SummaryCard label="Menunggu Persetujuan" bucket={summary?.pending} hint="sedang dicek Finance" dot="bg-amber-400"   amountCls="text-amber-700" />
          <SummaryCard
            label="Siap Dibayar" bucket={summary?.ready} dot="bg-blue-400" amountCls="text-blue-700"
            hint={summary && summary.ready.carryOver.amount > 0
              ? `termasuk ${formatCurrency(summary.ready.carryOver.amount)} dari periode lalu`
              : "dibayar lewat gaji"}
          />
          <SummaryCard label="Sudah Dibayar"        bucket={summary?.paid}    hint="sudah masuk gaji"     dot="bg-emerald-400" amountCls="text-emerald-700" />
        </div>

        {summary && period && summary.queued.amount > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="flex-1 min-w-[200px]">
              Slip gaji ini sudah dibuat. Ada <span className="font-semibold">{formatCurrency(summary.queued.amount)}</span>
              {" "}({summary.queued.count} komisi) disetujui yang belum masuk slip — akan ikut gaji berikutnya.
            </p>
            <Button
              size="sm" variant="outline"
              className="h-8 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              onClick={() => { setYearMonth(nextMonth(period.yearMonth)); setStatus(""); setPage(1); }}
            >
              Lihat Gaji {monthLabel(nextMonth(period.yearMonth))}
            </Button>
          </div>
        )}

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
            <EmptyState
              icon={<BadgeDollarSign className="w-6 h-6" />}
              title="Belum ada komisi"
              description="Belum ada komisi di periode gaji ini"
            />
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {commissions.map((c) => (
                  <div key={c.id} className="px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 font-mono">{c.invoice?.invoiceNo ?? c.invoiceId.slice(-8).toUpperCase()}</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDate(c.createdAt)}</p>
                      <JobLabel commission={c} />
                      <StoredCommissionBreakdown commission={c} className="mt-1" />
                      <div className="mt-1.5"><StatusBadge status={c.status} /></div>
                      {c.approvedAt && <p className="text-xs text-slate-400 mt-0.5">Disetujui {formatDate(c.approvedAt)}</p>}
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
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pengerjaan &amp; Perhitungan</th>
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
                          {canOpenInvoice ? (
                            <Link
                              to={`/invoices/${c.invoiceId}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {c.invoice?.invoiceNo ?? c.invoiceId.slice(-10).toUpperCase()}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-slate-600">
                              {c.invoice?.invoiceNo ?? c.invoiceId.slice(-10).toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <JobLabel commission={c} />
                          <StoredCommissionBreakdown commission={c} className="mt-1" />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={c.status} />
                          {c.approvedAt && <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">Disetujui {formatDate(c.approvedAt)}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold tabular-nums text-emerald-700 whitespace-nowrap">
                          {formatCurrency(c.commissionAmount)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {c.paidAt ? formatDate(c.paidAt) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {canOpenInvoice && <Link
                            to={`/invoices/${c.invoiceId}`}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                          >
                            Lihat <ChevronRight className="h-3.5 w-3.5" />
                          </Link>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <Pagination page={page} limit={20} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </PageContainer>
  );
}
