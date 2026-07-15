import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Ban,
  Clock,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateCommission } from "@/features/invoice/api/treatmentAssignment.api";
import {
  fetchCommissionGenerateList,
  skipCommission,
  resetCommissionSkip,
  type CommissionGenerateInvoice,
} from "@/features/invoice/api/commissionGenerate.api";

// ── Status helpers ────────────────────────────────────────────────────────

type KomisiStatus = "done" | "skip" | "belum";

function getKomisiStatus(inv: CommissionGenerateInvoice): KomisiStatus {
  if (inv._count.commissions > 0) return "done";
  if (inv.commissionSkipped)       return "skip";
  return "belum";
}

const STATUS_CONFIG: Record<KomisiStatus, { label: string; icon: React.ReactNode; className: string }> = {
  done:  {
    label:     "Sudah Generate",
    icon:      <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  skip:  {
    label:     "Tidak Ada Komisi",
    icon:      <Ban className="h-3.5 w-3.5" />,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  belum: {
    label:     "Belum Diproses",
    icon:      <Clock className="h-3.5 w-3.5" />,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────

export function GenerateKomisiPage() {
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate,   setEndDate]   = useState(today);

  const [generatingIds,  setGeneratingIds]  = useState<Set<string>>(new Set());
  const [skippingIds,    setSkippingIds]    = useState<Set<string>>(new Set());
  const [resettingIds,   setResettingIds]   = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey:       ["commission-generate-list", startDate, endDate],
    queryFn:        () => fetchCommissionGenerateList({ startDate, endDate, limit: 100 }),
    staleTime:      0,
    refetchOnMount: true,
  });

  const invoices = result?.data ?? [];
  const belumCount = invoices.filter((inv) => getKomisiStatus(inv) === "belum").length;
  const doneCount  = invoices.filter((inv) => getKomisiStatus(inv) === "done").length;
  const skipCount  = invoices.filter((inv) => getKomisiStatus(inv) === "skip").length;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["commission-generate-list"] });
  }

  async function handleGenerate(inv: CommissionGenerateInvoice) {
    setGeneratingIds((prev) => new Set([...prev, inv.id]));
    try {
      const res = await generateCommission(inv.id);
      toast.success(`${res.created} komisi dibuat untuk ${inv.invoiceNo}`);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal generate komisi");
    } finally {
      setGeneratingIds((prev) => { const s = new Set(prev); s.delete(inv.id); return s; });
    }
  }

  async function handleSkip(inv: CommissionGenerateInvoice) {
    setSkippingIds((prev) => new Set([...prev, inv.id]));
    try {
      await skipCommission(inv.id);
      toast.success(`${inv.invoiceNo} ditandai tidak ada komisi`);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai invoice");
    } finally {
      setSkippingIds((prev) => { const s = new Set(prev); s.delete(inv.id); return s; });
    }
  }

  async function handleResetSkip(inv: CommissionGenerateInvoice) {
    setResettingIds((prev) => new Set([...prev, inv.id]));
    try {
      await resetCommissionSkip(inv.id);
      toast.success(`${inv.invoiceNo} status skip komisi direset`);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal reset status skip");
    } finally {
      setResettingIds((prev) => { const s = new Set(prev); s.delete(inv.id); return s; });
    }
  }

  async function handleGenerateSemua() {
    const ready = invoices.filter((inv) => getKomisiStatus(inv) === "belum");
    if (ready.length === 0) return;
    setIsGeneratingAll(true);
    let successCount = 0;
    const errorNos: string[] = [];
    for (const inv of ready) {
      try {
        await generateCommission(inv.id);
        successCount++;
      } catch {
        errorNos.push(inv.invoiceNo);
      }
    }
    setIsGeneratingAll(false);
    refresh();
    if (errorNos.length === 0) {
      toast.success(`${successCount} invoice berhasil di-generate`);
    } else {
      toast.error(`${successCount} berhasil, gagal: ${errorNos.join(", ")}`);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Generate Komisi</h1>
        <p className="text-sm text-muted-foreground">
          Kelola komisi invoice yang sudah PAID. Generate komisi atau tandai sebagai tidak ada komisi.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-transparent focus:outline-none"
            />
          </div>
          <span className="text-muted-foreground text-xs px-1 select-none border-x border-input bg-muted/30 py-2">s/d</span>
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {belumCount > 0 && (
          <Button
            size="sm"
            disabled={isGeneratingAll}
            onClick={handleGenerateSemua}
          >
            {isGeneratingAll
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating...</>
              : `Generate Semua (${belumCount})`
            }
          </Button>
        )}
      </div>

      {/* Summary bar */}
      {!isLoading && invoices.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>Menampilkan <strong className="text-foreground">{invoices.length}</strong> invoice PAID</span>
          {belumCount > 0 && <span className="text-border">·</span>}
          {belumCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Clock className="w-3.5 h-3.5" />{belumCount} belum diproses
            </span>
          )}
          {doneCount > 0 && <span className="text-border">·</span>}
          {doneCount > 0 && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />{doneCount} sudah generate
            </span>
          )}
          {skipCount > 0 && <span className="text-border">·</span>}
          {skipCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground font-medium">
              <Ban className="w-3.5 h-3.5" />{skipCount} tidak ada komisi
            </span>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && invoices.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">Tidak ada invoice PAID untuk rentang tanggal ini.</p>
        </div>
      )}

      {/* Invoice list */}
      {!isLoading && invoices.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Invoice</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Pelanggan</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Tanggal</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground/70 uppercase tracking-wide">Total</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-foreground/70 uppercase tracking-wide">Status Komisi</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground/70 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {invoices.map((inv) => {
                const status  = getKomisiStatus(inv);
                const cfg     = STATUS_CONFIG[status];
                const isPending = generatingIds.has(inv.id) || skippingIds.has(inv.id) || resettingIds.has(inv.id) || isGeneratingAll;
                const isBelum = status === "belum";
                const isSkip  = status === "skip";

                return (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        {inv.invoiceNo}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{inv.customer.name}</div>
                      <div className="text-xs text-muted-foreground/70">{inv.customer.customerNo}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isBelum && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-muted-foreground"
                            disabled={isPending}
                            onClick={() => handleSkip(inv)}
                          >
                            {skippingIds.has(inv.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : "Tidak Ada Komisi"
                            }
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            disabled={isPending}
                            onClick={() => handleGenerate(inv)}
                          >
                            {generatingIds.has(inv.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : "Generate Komisi"
                            }
                          </Button>
                        </div>
                      )}
                      {isSkip && (
                        <div className="flex items-center justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            disabled={isPending}
                            onClick={() => handleResetSkip(inv)}
                          >
                            {resettingIds.has(inv.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : "Batalkan Skip"
                            }
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
