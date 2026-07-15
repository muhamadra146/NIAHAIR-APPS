import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchMyLoan } from "../api";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    "Aktif",
  PAID_OFF:  "Lunas",
  CANCELLED: "Dibatalkan",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    "text-blue-600 border-blue-200 bg-blue-50",
  PAID_OFF:  "text-green-600 border-green-200 bg-green-50",
  CANCELLED: "text-muted-foreground",
};

export function MyLoanDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: loan, isLoading, isError } = useQuery({
    queryKey: ["my-loan", id],
    queryFn:  () => fetchMyLoan(id!),
    enabled:  !!id,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !loan) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Kasbon tidak ditemukan.{" "}
          <Link to="/my-kasbon" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const paid = Number(loan.totalAmount) - Number(loan.remainingAmount);
  const pct  = Number(loan.totalAmount) > 0
    ? Math.round((paid / Number(loan.totalAmount)) * 100)
    : 0;

  return (
    <PageContainer>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/my-kasbon"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{loan.loanNo}</h1>
              <Badge variant="outline" className={`text-xs ${STATUS_COLOR[loan.status] ?? ""}`}>
                {STATUS_LABEL[loan.status] ?? loan.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Kasbon Saya</p>
          </div>
        </div>

        {/* Info card */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Informasi Kasbon</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Total Kasbon"   value={formatCurrency(loan.totalAmount)} />
              <InfoRow label="Cicilan/Bulan"  value={formatCurrency(loan.monthlyDeduction)} />
              <InfoRow label="Tanggal Mulai"  value={formatDate(loan.startDate)} />
              {loan.endDate && <InfoRow label="Tanggal Selesai" value={formatDate(loan.endDate)} />}
              <InfoRow label="Sisa"           value={
                <span className={Number(loan.remainingAmount) > 0 ? "font-semibold text-amber-600" : "font-semibold text-green-600"}>
                  {Number(loan.remainingAmount) > 0 ? formatCurrency(loan.remainingAmount) : "Lunas"}
                </span>
              } />
              <InfoRow label="Sudah Dibayar" value={
                <span className="font-semibold text-foreground">{formatCurrency(paid)}</span>
              } />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progress pelunasan</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${loan.status === "PAID_OFF" ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Dibayar: {formatCurrency(paid)}</span>
                <span>Sisa: {formatCurrency(loan.remainingAmount)}</span>
              </div>
            </div>

            {loan.notes && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {loan.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repayment history */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Riwayat Angsuran ({loan.repayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loan.repayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada angsuran.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Tanggal</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/70 uppercase tracking-wide">Jumlah</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Sumber</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.repayments.map((r) => (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.paidAt)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-700">{formatCurrency(r.amount)}</td>
                        <td className="px-4 py-2.5">
                          {r.payrollId ? (
                            <span className="inline-flex items-center text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                              Payroll
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
