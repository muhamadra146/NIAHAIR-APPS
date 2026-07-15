import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Banknote, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchMyLoans } from "../api";
import type { Loan } from "../types";

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

export function MyLoanPage() {
  const navigate = useNavigate();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["my-loans"],
    queryFn:  fetchMyLoans,
  });

  const activeLoans    = loans.filter((l) => l.status === "ACTIVE");
  const finishedLoans  = loans.filter((l) => l.status !== "ACTIVE");
  const totalRemaining = activeLoans.reduce((sum, l) => sum + Number(l.remainingAmount), 0);
  const isEmpty        = !isLoading && loans.length === 0;

  // Pembungkus 1: min-h-full flex-col — mengisi seluruh area main
  // Pembungkus 2: conditional — center jika kosong, padding normal jika ada data
  return (
    <div className="min-h-full flex flex-col">
      <div className={isEmpty
        ? "flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        : "mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 sm:py-8 space-y-5"
      }>
        {isEmpty ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-foreground">Tidak ada kasbon</p>
            <p className="text-xs">Anda tidak memiliki kasbon aktif maupun riwayat kasbon.</p>
          </>
        ) : (
          <>
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Kasbon Saya</h1>
              <p className="text-sm text-muted-foreground">
                Informasi kasbon dan riwayat cicilan Anda.
              </p>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Summary bar */}
            {!isLoading && activeLoans.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                    <Banknote className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total sisa kasbon aktif</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(totalRemaining)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {activeLoans.length} kasbon aktif
                </div>
              </div>
            )}

            {/* Active loans */}
            {!isLoading && activeLoans.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Aktif</h2>
                {activeLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} onClick={() => navigate(`/my-kasbon/${loan.id}`)} />
                ))}
              </section>
            )}

            {/* Finished loans */}
            {!isLoading && finishedLoans.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Riwayat</h2>
                {finishedLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} onClick={() => navigate(`/my-kasbon/${loan.id}`)} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoanCard({ loan, onClick }: { loan: Loan; onClick: () => void }) {
  const paid     = Number(loan.totalAmount) - Number(loan.remainingAmount);
  const pct      = Number(loan.totalAmount) > 0
    ? Math.round((paid / Number(loan.totalAmount)) * 100)
    : 0;
  const isActive = loan.status === "ACTIVE";

  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{loan.loanNo}</p>
          <p className="text-sm font-semibold">{formatCurrency(loan.totalAmount)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cicilan {formatCurrency(loan.monthlyDeduction)}/bulan · Mulai {formatDate(loan.startDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${STATUS_COLOR[loan.status] ?? ""}`}>
            {STATUS_LABEL[loan.status] ?? loan.status}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{isActive ? `Sisa: ${formatCurrency(loan.remainingAmount)}` : "Lunas"}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isActive ? "bg-primary" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
