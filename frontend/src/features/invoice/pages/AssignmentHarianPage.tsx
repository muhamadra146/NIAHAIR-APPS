import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/axios";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";
import type { TreatmentItem } from "@/features/appointment/types";
import {
  setupTreatment,
  generateCommission,
  deleteAssignment,
} from "@/features/invoice/api/treatmentAssignment.api";
import { AssignmentForm } from "@/features/invoice/components/shared/AssignmentForm";

// ── Types ─────────────────────────────────────────────────────────────────

interface DailyInvoice {
  id:         string;
  invoiceNo:  string;
  grandTotal: string;
  customer:   { id: string; name: string; customerNo: string };
  treatmentSessions: Array<{
    id:             string;
    treatmentItems: TreatmentItem[];
  }>;
  _count: { commissions: number };
}

type InvoiceStatus = "done" | "siap" | "sebagian" | "belum" | "no-session";

function getInvoiceStatus(inv: DailyInvoice): InvoiceStatus {
  if (inv._count.commissions > 0) return "done";
  const session = inv.treatmentSessions[0];
  if (!session) return "no-session";
  const items = session.treatmentItems ?? [];
  if (items.length === 0) return "belum";
  const assignedCount = items.filter((i) => (i.assignments ?? []).length > 0).length;
  if (assignedCount === 0) return "belum";
  if (assignedCount < items.length) return "sebagian";
  return "siap";
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  done:           { label: "Done",          className: "bg-green-100 text-green-700 border-green-200" },
  siap:           { label: "Siap Generate", className: "bg-blue-100 text-blue-700 border-blue-200"   },
  sebagian:       { label: "Sebagian",      className: "bg-amber-100 text-amber-700 border-amber-200" },
  belum:          { label: "Belum Assign",  className: "bg-gray-100 text-gray-600 border-gray-200"   },
  "no-session":   { label: "Perlu Setup",   className: "bg-orange-100 text-orange-700 border-orange-200" },
};

async function fetchDailyAssignment(date: string) {
  const res = await api.get<ApiResponse<{ data: DailyInvoice[]; truncated: boolean; date: string }>>(
    "/invoices/daily-assignment",
    { params: { date } },
  );
  return res.data.data;
}

// ── Page ──────────────────────────────────────────────────────────────────

export function AssignmentHarianPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openIds,      setOpenIds]      = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [settingUpIds,  setSettingUpIds]  = useState<Set<string>>(new Set());
  const [deletingIds,   setDeletingIds]   = useState<Set<string>>(new Set());

  const { data: result, isLoading } = useQuery({
    queryKey:  ["daily-assignment", date],
    queryFn:   () => fetchDailyAssignment(date),
    staleTime: 30_000,
  });

  const invoices  = result?.data     ?? [];
  const truncated = result?.truncated ?? false;

  const statuses   = invoices.map(getInvoiceStatus);
  const belumCount = statuses.filter((s) => s === "belum" || s === "sebagian").length;
  const siapCount  = statuses.filter((s) => s === "siap").length;
  const doneCount  = statuses.filter((s) => s === "done").length;

  // ── Handlers ──────────────────────────────────────────────────────────

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function refreshDaily() {
    qc.invalidateQueries({ queryKey: ["daily-assignment", date] });
  }

  async function handleSetup(invoiceId: string) {
    setSettingUpIds((prev) => new Set([...prev, invoiceId]));
    try {
      await setupTreatment(invoiceId);
      refreshDaily();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal setup treatment");
    } finally {
      setSettingUpIds((prev) => { const s = new Set(prev); s.delete(invoiceId); return s; });
    }
  }

  async function handleGenerateOne(invoiceId: string) {
    setGeneratingIds((prev) => new Set([...prev, invoiceId]));
    try {
      const res = await generateCommission(invoiceId);
      toast.success(`${res.created} komisi dibuat`);
      refreshDaily();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal generate komisi");
    } finally {
      setGeneratingIds((prev) => { const s = new Set(prev); s.delete(invoiceId); return s; });
    }
  }

  async function handleGenerateSemua() {
    const ready = invoices.filter((inv) => getInvoiceStatus(inv) === "siap");
    if (ready.length === 0) return;
    setIsGenerating(true);
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
    setIsGenerating(false);
    refreshDaily();
    if (errorNos.length === 0) {
      toast.success(`${successCount} invoice berhasil di-generate`);
    } else {
      toast.error(`${successCount} berhasil · gagal: ${errorNos.join(", ")}`);
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    setDeletingIds((prev) => new Set([...prev, assignmentId]));
    try {
      await deleteAssignment(assignmentId);
      refreshDaily();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus assignment");
    } finally {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(assignmentId); return s; });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Assignment Harian</h1>
        <p className="text-sm text-muted-foreground">Assign komisi karyawan per invoice untuk hari ini.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Tanggal</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {siapCount > 0 && (
          <Button
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerateSemua}
          >
            {isGenerating
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</>
              : `Generate Semua (${siapCount})`
            }
          </Button>
        )}
      </div>

      {/* Summary badges */}
      {!isLoading && invoices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{invoices.length} invoice</span>
          {belumCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {belumCount} belum/sebagian
            </Badge>
          )}
          {siapCount > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              {siapCount} siap generate
            </Badge>
          )}
          {doneCount > 0 && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              {doneCount} done
            </Badge>
          )}
        </div>
      )}

      {/* Truncation banner */}
      {truncated && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Menampilkan 100 invoice pertama. Pilih tanggal yang lebih spesifik untuk melihat semua.
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && invoices.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">Tidak ada invoice untuk tanggal ini.</p>
        </div>
      )}

      {/* Invoice accordion list */}
      {!isLoading && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const status  = getInvoiceStatus(inv);
            const isOpen  = openIds.has(inv.id);
            const session = inv.treatmentSessions[0];
            const items   = session?.treatmentItems ?? [];
            const isDone  = status === "done";
            const cfg     = STATUS_CONFIG[status];

            return (
              <div key={inv.id} className="rounded-xl border border-border bg-card shadow-sm">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleOpen(inv.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOpen
                      ? <ChevronDown  className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-medium">{formatCurrency(inv.grandTotal)}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-4">
                    {/* No-session state */}
                    {status === "no-session" && (
                      <div className="flex items-center justify-between rounded-md border border-border p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          Assignment pekerjaan belum diatur.
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={settingUpIds.has(inv.id) || isGenerating}
                          onClick={() => handleSetup(inv.id)}
                        >
                          {settingUpIds.has(inv.id)
                            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Menyiapkan…</>
                            : "Setup Assignment"
                          }
                        </Button>
                      </div>
                    )}

                    {/* Treatment items */}
                    {session && items.map((item) => {
                      const assignments   = item.assignments ?? [];
                      const hasAssignment = assignments.length > 0;
                      const maxWork       = Number(item.qty) * Number(item.conversionSnapshot);

                      return (
                        <div key={item.id} className="rounded-md border border-border overflow-hidden">
                          {/* Item header */}
                          <div className={`flex items-center justify-between px-3 py-2 ${hasAssignment ? "bg-green-50" : "bg-muted/30"}`}>
                            <div>
                              <p className="text-sm font-medium">{item.item.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.item.itemCode}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {assignments.length} staff · {maxWork.toLocaleString("id-ID")} {item.unit.name}
                              </p>
                              <p className="text-xs font-medium">{formatCurrency(item.priceSnapshot)}</p>
                              {hasAssignment && <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 mt-0.5" />}
                            </div>
                          </div>

                          {/* Assignment rows + form */}
                          <div className="divide-y divide-border/50 px-3">
                            {assignments.map((a) => (
                              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {a.slotKey ? a.slotKey.charAt(0).toUpperCase() + a.slotKey.slice(1) : "—"}
                                  </Badge>
                                  <span className="font-medium">{a.employee.name}</span>
                                  <span className="text-muted-foreground text-xs">{a.employee.employeeCode}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {Number(a.workQty).toLocaleString("id-ID")} {item.unit.name}
                                  </span>
                                  {!isDone && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAssignment(a.id)}
                                      disabled={deletingIds.has(a.id) || isGenerating}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      {deletingIds.has(a.id)
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Trash2 className="h-3.5 w-3.5" />
                                      }
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}

                            {!isDone && (
                              <div className="py-3">
                                <AssignmentForm
                                  treatmentItem={item}
                                  appointment={null}
                                  onAdded={refreshDaily}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Per-invoice generate button */}
                    {session && items.length > 0 && !isDone && (
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <div>
                          {status === "sebagian" && (
                            <p className="text-xs text-amber-600">Beberapa item belum fully assigned.</p>
                          )}
                          {status === "belum" && (
                            <p className="text-xs text-muted-foreground">Belum ada assignment pada invoice ini.</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          disabled={status !== "siap" || generatingIds.has(inv.id) || isGenerating}
                          onClick={() => handleGenerateOne(inv.id)}
                        >
                          {generatingIds.has(inv.id)
                            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Memproses…</>
                            : "Generate Komisi"
                          }
                        </Button>
                      </div>
                    )}

                    {isDone && (
                      <div className="flex items-center gap-2 text-sm text-green-700 pt-1 border-t border-border">
                        <CheckCircle2 className="h-4 w-4" />
                        Komisi sudah digenerate untuk invoice ini.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
