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

const STATUS_COLOR: Record<string, string> = {
  PENDING:  "text-yellow-600 border-yellow-300",
  APPROVED: "text-blue-600 border-blue-300",
  PAID:     "text-green-600 border-green-300",
};

export function CommissionListPage() {
  const { user, branchId } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

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

  // Summary counts
  const counts = commissions.reduce(
    (acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const totalAmount = commissions.reduce(
    (sum, c) => sum + Number(c.commissionAmount), 0,
  );

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
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
          <SummaryCard icon={<Filter className="h-4 w-4" />} label="Total Ditampilkan" value={String(commissions.length)} color="text-foreground" />
          <SummaryCard icon={<Clock className="h-4 w-4" />} label="Pending" value={String(counts["PENDING"] ?? 0)} color="text-yellow-600" />
          <SummaryCard icon={<CheckCircle className="h-4 w-4" />} label="Disetujui" value={String(counts["APPROVED"] ?? 0)} color="text-blue-600" />
          <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Total Komisi" value={formatCurrency(totalAmount)} color="text-green-600" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 pt-4">
            {/* Status tabs */}
            <div className="flex gap-1 flex-wrap mb-3">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    status === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date range */}
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
                  <Button variant="ghost" size="sm" onClick={() => { setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs">Reset</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : commissions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada komisi.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Karyawan</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Komisi</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        {isSuperAdmin && <th className="px-4 py-3"></th>}
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
                <div className="md:hidden divide-y divide-border">
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
    </PageContainer>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={`flex items-center gap-2 mb-1 ${color}`}>{icon}<span className="text-xs font-medium">{label}</span></div>
        <p className="text-lg font-bold">{value}</p>
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
    <tr className="border-b border-border transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <p className="font-medium">{c.employee?.name ?? "—"}</p>
        {c.employee?.employeeCode && <p className="text-xs text-muted-foreground">{c.employee.employeeCode}</p>}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.invoiceId.slice(-8).toUpperCase()}</td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {c.commissionType === "PERCENTAGE"
            ? `${Number(c.commissionValue)}%`
            : formatCurrency(c.commissionValue)}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(c.commissionAmount)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(c.createdAt)}</td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={`text-xs ${STATUS_COLOR[c.status] ?? ""}`}>
          {STATUS_LABEL[c.status] ?? c.status}
        </Badge>
      </td>
      {isSuperAdmin && (
        <td className="px-4 py-3">
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
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{c.employee?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground font-mono">Invoice …{c.invoiceId.slice(-8).toUpperCase()}</p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLOR[c.status] ?? ""}`}>
          {STATUS_LABEL[c.status] ?? c.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>
        <span className="font-semibold text-primary">{formatCurrency(c.commissionAmount)}</span>
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
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onApprove} disabled={approving}>
        {approving ? "…" : "Setujui"}
      </Button>
    );
  }
  if (status === "APPROVED") {
    return (
      <Button size="sm" className="h-7 text-xs" onClick={onPay} disabled={paying}>
        {paying ? "…" : "Bayar"}
      </Button>
    );
  }
  return null;
}
