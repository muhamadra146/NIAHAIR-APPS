import { useState } from "react";
import { CheckCircle, DollarSign, Clock, Filter } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCommissions, useApproveCommission, usePayCommission } from "../hooks";
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

export function CommissionListPage() {
  const { user, branchId } = useAuthStore();
  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";

  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");

  const { data, isLoading } = useCommissions({
    page, limit: 20,
    branchId:  branchId  || undefined,
    status:    status    || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });

  const approveMutation = useApproveCommission();
  const payMutation     = usePayCommission();

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

  return (
    <PageContainer>
      <div className="space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Komisi</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} komisi` : "Kelola komisi karyawan"}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard icon={<Filter className="h-4 w-4" />}      label="Ditampilkan" value={String(commissions.length)} iconColor="text-slate-500"   bgColor="bg-slate-50"   />
          <SummaryCard icon={<Clock className="h-4 w-4" />}       label="Pending"     value={String(counts["PENDING"] ?? 0)} iconColor="text-yellow-600" bgColor="bg-yellow-50" />
          <SummaryCard icon={<CheckCircle className="h-4 w-4" />} label="Disetujui"   value={String(counts["APPROVED"] ?? 0)} iconColor="text-blue-600"   bgColor="bg-blue-50"   />
          <SummaryCard icon={<DollarSign className="h-4 w-4" />}  label="Total Komisi" value={formatCurrency(totalAmount)} iconColor="text-emerald-600" bgColor="bg-emerald-50" />
        </div>

        {/* Filter + table */}
        <Card className="rounded-2xl border border-slate-100/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 pt-4">

            {/* Status tabs */}
            <div className="flex gap-1 flex-wrap mb-4">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    status === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className={`${filterInputCls} w-36`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className={`${filterInputCls} w-36`} />
              </div>
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={() => { setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs text-slate-500 hover:text-slate-800">
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
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tipe</th>
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
      </div>
    </PageContainer>
  );
}

function SummaryCard({
  icon, label, value, iconColor, bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <Card className="rounded-2xl border border-slate-100/80 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${bgColor} ${iconColor} mb-2`}>
          {icon}
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
      </CardContent>
    </Card>
  );
}

interface CommissionActionProps {
  commission:  Commission;
  isSuperAdmin: boolean;
  onApprove:   () => void;
  onPay:       () => void;
  approving:   boolean;
  paying:      boolean;
}

function CommissionRow({ commission: c, isSuperAdmin, onApprove, onPay, approving, paying }: CommissionActionProps) {
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
        <Badge
          variant="outline"
          className={`text-xs rounded-lg px-2 py-0.5 font-medium ${STATUS_BADGE[c.status] ?? ""}`}
        >
          {STATUS_LABEL[c.status] ?? c.status}
        </Badge>
      </td>
      {isSuperAdmin && (
        <td className="px-5 py-4">
          <ActionButtons
            status={c.status}
            onApprove={onApprove}
            onPay={onPay}
            approving={approving}
            paying={paying}
          />
        </td>
      )}
    </tr>
  );
}

function CommissionCard({ commission: c, isSuperAdmin, onApprove, onPay, approving, paying }: CommissionActionProps) {
  return (
    <div className="px-5 py-4 space-y-2 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-slate-800">{c.employee?.name ?? "—"}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Invoice …{c.invoiceId.slice(-8).toUpperCase()}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs rounded-lg px-2 py-0.5 font-medium shrink-0 ${STATUS_BADGE[c.status] ?? ""}`}
        >
          {STATUS_LABEL[c.status] ?? c.status}
        </Badge>
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
            approving={approving}
            paying={paying}
          />
        </div>
      )}
    </div>
  );
}

function ActionButtons({ status, onApprove, onPay, approving, paying }: {
  status:    CommissionStatus;
  onApprove: () => void;
  onPay:     () => void;
  approving: boolean;
  paying:    boolean;
}) {
  if (status === "PENDING") {
    return (
      <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={onApprove} disabled={approving}>
        {approving ? "…" : "Setujui"}
      </Button>
    );
  }
  if (status === "APPROVED") {
    return (
      <Button size="sm" className="h-7 rounded-lg text-xs" onClick={onPay} disabled={paying}>
        {paying ? "…" : "Bayar"}
      </Button>
    );
  }
  return null;
}
