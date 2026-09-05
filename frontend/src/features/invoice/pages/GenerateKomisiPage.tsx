import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, Clock, Ban,
  AlertCircle, ExternalLink, RefreshCw, Lock, X, Loader2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast }    from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEmployees } from "@/features/employee/hooks";
import {
  fetchJobAssignmentInvoices,
  submitJobAssignments,
  type JobAssignmentInvoice,
} from "@/features/invoice/api/commissionGenerate.api";
import { fetchConsultationNoteByInvoice } from "@/features/consultation/api";
import { ConsultationNoteModal } from "@/features/invoice/components/ConsultationNoteModal";

// ── Types ─────────────────────────────────────────────────────────────

type InvoiceStatus = "belum" | "terisi" | "pending" | "approved" | "paid";

function getInvoiceStatus(inv: JobAssignmentInvoice): InvoiceStatus {
  if (inv.commissions.some((c) => c.status === "PAID"))     return "paid";
  if (inv.commissions.some((c) => c.status === "APPROVED")) return "approved";
  if (inv._count.commissions > 0)                           return "pending";
  // Cek apakah ada job assignment yang sudah diisi (pengerjaan sudah disimpan)
  const hasAssignments = inv.treatmentSessions.some((s) =>
    s.treatmentItems.some((ti) =>
      ti.jobAssignments.some(
        (ja) => ja.commissionJobId !== null && ja.employeeId !== null,
      ),
    ),
  );
  if (hasAssignments) return "terisi";
  return "belum";
}

const STATUS_CFG: Record<InvoiceStatus, { label: string; icon: React.ReactNode; badge: string }> = {
  belum:    { label: "Belum Diisi",       icon: <Clock className="h-3 w-3" />,        badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
  terisi:   { label: "Siap Kalkulasi",    icon: <Clock className="h-3 w-3" />,        badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"   },
  pending:  { label: "Menunggu Approval", icon: <Clock className="h-3 w-3" />,        badge: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800" },
  approved: { label: "Disetujui",         icon: <Lock className="h-3 w-3" />,         badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
  paid:     { label: "Dibayar",           icon: <CheckCircle2 className="h-3 w-3" />, badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
};

// key: `invoiceId::treatmentItemId::employeeId::commissionJobId`
type JobCheckMap = Record<string, boolean>;
type WorkQtyMap  = Record<string, number | "">;

// ── Date helpers ──────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ── Job Assignment Modal ──────────────────────────────────────────────

function JobAssignmentModal({
  inv,
  allEmployees,
  onClose,
  onSuccess,
  onNoteNeeded,
}: {
  inv:           JobAssignmentInvoice;
  allEmployees:  { id: string; name: string; employeeCode: string }[];
  onClose:       () => void;
  onSuccess:     () => void;
  onNoteNeeded:  (inv: JobAssignmentInvoice) => void;
}) {
  const status = getInvoiceStatus(inv);
  const locked = status === "approved" || status === "paid";
  const cfg    = STATUS_CFG[status];

  // ── Pre-fill dari job assignments yang sudah tersimpan ─────────────
  const [jobCheckMap, setJobCheckMap] = useState<JobCheckMap>(() => {
    const map: JobCheckMap = {};
    inv.treatmentSessions.forEach((session) => {
      session.treatmentItems.forEach((ti) => {
        ti.jobAssignments.forEach((ja) => {
          if (ja.employeeId && ja.commissionJobId) {
            map[`${inv.id}::${ti.id}::${ja.employeeId}::${ja.commissionJobId}`] = true;
          }
        });
      });
    });
    return map;
  });

  const [workQtyMap, setWorkQtyMap] = useState<WorkQtyMap>(() => {
    const map: WorkQtyMap = {};
    inv.treatmentSessions.forEach((session) => {
      session.treatmentItems.forEach((ti) => {
        ti.jobAssignments.forEach((ja) => {
          if (ja.employeeId && ja.commissionJobId && ja.workQty) {
            const key = `${inv.id}::${ti.id}::${ja.employeeId}::${ja.commissionJobId}`;
            map[key]  = Number(ja.workQty);
          }
        });
      });
    });
    return map;
  });

  // ── Lock body scroll + Escape key ─────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );
  useEffect(() => {
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // ── Submit ──────────────────────────────────────────────────────────
  const submitMut = useMutation({
    mutationFn: async () => {
      const sessions = inv.treatmentSessions.map((session) => {
        const assignments = session.treatmentItems.flatMap((ti) => {
          const categoryJobs = ti.item.commissionCategory?.jobs ?? [];
          if (categoryJobs.length === 0) return [];

          const staffList = session.appointment
            ? session.appointment.staffs.map((s) => s.employee)
            : allEmployees;

          return staffList.flatMap((emp) =>
            categoryJobs
              .filter((job) => jobCheckMap[`${inv.id}::${ti.id}::${emp.id}::${job.id}`])
              .map((job) => {
                const key = `${inv.id}::${ti.id}::${emp.id}::${job.id}`;
                const qty = workQtyMap[key];
                return {
                  treatmentItemId: ti.id,
                  commissionJobId: job.id,
                  employeeId:      emp.id,
                  workQty:         typeof qty === "number" ? qty : null,
                };
              }),
          );
        });
        return { sessionId: session.id, assignments };
      });
      return submitJobAssignments(inv.id, { sessions });
    },
    onSuccess: () => {
      toast.success("Pengerjaan berhasil disimpan");
      onSuccess();
      onClose();
      // Cek apakah invoice ini sudah punya catatan klien.
      // Jika belum → tampilkan ConsultationNoteModal sebagai langkah wajib.
      void fetchConsultationNoteByInvoice(inv.id)
        .then((note) => {
          if (!note) onNoteNeeded(inv);
        })
        .catch(() => {
          // Jika pengecekan gagal, jangan blokir alur komisi
        });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : "Gagal menyimpan");
      toast.error(msg);
    },
  });

  // ── Items dengan job komisi baru ───────────────────────────────────
  const jobItems = inv.treatmentSessions.flatMap((session) =>
    session.treatmentItems
      .filter((ti) => (ti.item.commissionCategory?.jobs?.length ?? 0) > 0)
      .map((ti) => ({ ti, session })),
  );

  const hasOldSystem = inv.treatmentSessions.some((s) =>
    s.treatmentItems.some(
      (ti) =>
        (ti.item.commissionCategory?.jobs?.length ?? 0) === 0 &&
        ti.item.serviceJobRoles.length > 0,
    ),
  );

  // Apakah ada minimal 1 job yang dicek (untuk validasi tombol simpan)
  const hasAnyChecked = Object.values(jobCheckMap).some(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold">Isi Pengerjaan</h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}
              >
                {cfg.icon}{cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {inv.invoiceNo} · {inv.customer.name} · {formatDate(inv.invoiceDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {jobItems.length === 0 && !hasOldSystem && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">Invoice ini belum dikonfigurasi komisi.</p>
            </div>
          )}

          {jobItems.map(({ ti, session }) => {
            const jobs      = ti.item.commissionCategory!.jobs;
            const staffList = session.appointment
              ? session.appointment.staffs.map((s) => s.employee)
              : allEmployees;

            // Hitung total helai dari qty × conversionSnapshot
            const totalHelai = Math.round(
              Number(ti.qty ?? 0) * Number(ti.conversionSnapshot ?? 1),
            );

            return (
              <div key={ti.id} className="rounded-xl border border-border overflow-hidden">
                {/* Item header */}
                <div className="px-4 py-3 bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">{ti.item.name}</p>
                    {ti.subtotal && (
                      <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                        {formatCurrency(ti.subtotal)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    {ti.item.commissionCategory?.name && (
                      <span className="text-xs text-muted-foreground">
                        {ti.item.commissionCategory.name}
                      </span>
                    )}
                    {totalHelai > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {totalHelai} helai
                          {ti.unit ? ` (${Number(ti.qty ?? 0)} ${ti.unit.name})` : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Staff + job rows */}
                <div className="divide-y divide-border">
                  {staffList.map((emp) => (
                    <div key={emp.id} className="px-4 py-3">
                      {/* Staff name */}
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {emp.name}
                      </p>

                      {/* Jobs */}
                      <div className="space-y-2">
                        {jobs.map((job) => {
                          const key     = `${inv.id}::${ti.id}::${emp.id}::${job.id}`;
                          const checked = !!jobCheckMap[key];
                          const qty     = workQtyMap[key];
                          // FLAT helper: ada deductsFromJobId tapi TIDAK ada pricePerUnit
                          // → tidak perlu input helai, nilai dibagi otomatis saat kalkulasi
                          const isFlatJob =
                            job.deductsFromJobId !== null &&
                            (job.pricePerUnit === null || job.pricePerUnit === "0");

                          return (
                            <div key={job.id} className="flex items-center gap-3">
                              {/* Checkbox atau icon (locked) */}
                              {locked ? (
                                <div className="h-4 w-4 shrink-0 flex items-center justify-center">
                                  {checked && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              ) : (
                                <input
                                  type="checkbox"
                                  id={key}
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setJobCheckMap((prev) => ({ ...prev, [key]: true }));
                                      // Auto-fill helai = qty × conversionSnapshot (mis: 1 TEBAL × 180 = 180 helai)
                                      if (!isFlatJob) {
                                        const helai = Math.round(
                                          Number(ti.qty ?? 0) * Number(ti.conversionSnapshot ?? 1),
                                        );
                                        if (helai > 0) {
                                          setWorkQtyMap((prev) =>
                                            prev[key] !== undefined ? prev : { ...prev, [key]: helai },
                                          );
                                        }
                                      }
                                    } else {
                                      setJobCheckMap((prev) => {
                                        const next = { ...prev };
                                        delete next[key];
                                        return next;
                                      });
                                    }
                                  }}
                                  className="h-4 w-4 shrink-0 rounded accent-primary cursor-pointer"
                                />
                              )}

                              {/* Job name */}
                              <label
                                htmlFor={locked ? undefined : key}
                                className={`text-sm flex-1 ${
                                  !checked ? "text-muted-foreground" : ""
                                } ${!locked ? "cursor-pointer" : ""}`}
                              >
                                {job.name}
                              </label>

                              {/* Flat badge (jika flat dan dicek) */}
                              {checked && isFlatJob && (
                                <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded px-1.5 py-0.5 shrink-0">
                                  flat
                                </span>
                              )}

                              {/* WorkQty input (tampil saat dicek, HANYA untuk non-flat) */}
                              {checked && !isFlatJob && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {locked ? (
                                    <span className="text-sm font-medium tabular-nums min-w-[3rem] text-right">
                                      {typeof qty === "number" ? qty : "—"}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder="0"
                                      value={qty ?? ""}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setWorkQtyMap((prev) => ({
                                          ...prev,
                                          [key]: isNaN(v) ? "" : v,
                                        }));
                                      }}
                                      className="w-20 h-7 rounded-lg border border-input bg-background px-2 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                  )}
                                  <span className="text-xs text-muted-foreground">helai</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Old system notice */}
          {hasOldSystem && (
            <div className="flex items-start gap-2 rounded-xl border border-border px-4 py-3 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Beberapa item masih menggunakan sistem komisi lama (Service Job Role) — tidak ditampilkan di sini.
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        {locked ? (
          <div className="border-t border-border px-5 py-4 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <Lock className="h-4 w-4 shrink-0" />
            Komisi sudah {status === "paid" ? "dibayar" : "disetujui"} — tidak bisa diubah
          </div>
        ) : (
          <div className="border-t border-border px-5 py-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {hasAnyChecked
                ? "Centang job dan isi jumlah helai untuk setiap staf"
                : "Belum ada job yang dicek"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onClose} disabled={submitMut.isPending}>
                Batal
              </Button>
              <Button
                size="sm"
                disabled={!hasAnyChecked || submitMut.isPending}
                onClick={() => submitMut.mutate()}
              >
                {submitMut.isPending
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Menyimpan...</>
                  : "Simpan Pengerjaan"
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export function GenerateKomisiPage() {
  const qc = useQueryClient();

  const [date,            setDate]            = useState(todayStr);
  const [selectedInvoice, setSelectedInvoice] = useState<JobAssignmentInvoice | null>(null);
  const [noteInvoice,     setNoteInvoice]     = useState<JobAssignmentInvoice | null>(null);
  const [expandedGroups,  setExpandedGroups]  = useState<Set<InvoiceStatus>>(
    new Set(["belum", "terisi", "pending"]),
  );

  const isToday   = date === todayStr();
  const dateLabel = isToday ? "Hari Ini" : formatDateLabel(date);

  const { data: invoices = [], isLoading, isFetching, refetch } = useQuery({
    queryKey:       ["job-assignment-invoices", date],
    queryFn:        () => fetchJobAssignmentInvoices({ startDate: date, endDate: date }),
    staleTime:      0,
    refetchOnMount: true,
  });

  const { data: empData } = useEmployees({ isActive: true, limit: 200 });
  const allEmployees = useMemo(() => empData?.data ?? [], [empData]);

  function toggleGroup(status: InvoiceStatus) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  // Group invoices by status
  const groups: { status: InvoiceStatus; label: string; items: JobAssignmentInvoice[] }[] = [
    { status: "belum",    label: "Belum Diisi",       items: invoices.filter((i) => getInvoiceStatus(i) === "belum") },
    { status: "terisi",   label: "Siap Kalkulasi",    items: invoices.filter((i) => getInvoiceStatus(i) === "terisi") },
    { status: "pending",  label: "Menunggu Approval", items: invoices.filter((i) => getInvoiceStatus(i) === "pending") },
    { status: "approved", label: "Disetujui",         items: invoices.filter((i) => getInvoiceStatus(i) === "approved") },
    { status: "paid",     label: "Dibayar",           items: invoices.filter((i) => getInvoiceStatus(i) === "paid") },
  ].filter((g) => g.items.length > 0);

  return (
    <PageContainer
      title="Generate Komisi"
      subtitle={dateLabel}
      action={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline" size="icon" className="h-8 w-8 rounded-lg"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            variant="outline" size="icon" className="h-8 w-8 rounded-lg"
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button
              variant="outline" size="sm" className="h-8 text-xs rounded-lg"
              onClick={() => setDate(todayStr())}
            >
              Hari Ini
            </Button>
          )}
          <Button
            variant="outline" size="icon" className="h-8 w-8 rounded-lg"
            onClick={() => void refetch()}
            disabled={isLoading || isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

      {/* ── Summary ─────────────────────────────────────────────── */}
      {!isLoading && invoices.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{invoices.length} invoice</span>
          {groups.map((g) => {
            const cfg = STATUS_CFG[g.status];
            return (
              <span key={g.status} className="flex items-center gap-1">
                <span className="text-border">·</span>
                <span className={`flex items-center gap-1 font-medium ${
                  g.status === "belum"
                    ? "text-amber-600 dark:text-amber-400"
                    : g.status === "terisi"
                      ? "text-blue-600 dark:text-blue-400"
                      : g.status === "pending"
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-green-600 dark:text-green-400"
                }`}>
                  {cfg.icon}
                  {g.items.length} {g.label.toLowerCase()}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────── */}
      {!isLoading && invoices.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Ban className="h-8 w-8" />
          <p className="text-sm">Tidak ada invoice PAID pada tanggal ini.</p>
        </div>
      )}

      {/* ── Invoice groups ───────────────────────────────────────── */}
      {!isLoading && (
        <div className="space-y-4">
          {groups.map((group) => {
            const cfg      = STATUS_CFG[group.status];
            const expanded = expandedGroups.has(group.status);
            return (
              <div key={group.status}>
                {/* Group header */}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 mb-2 text-left"
                  onClick={() => toggleGroup(group.status)}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                  <span className={`rounded-full border px-1.5 py-0 text-[11px] font-semibold ${cfg.badge}`}>
                    {group.items.length}
                  </span>
                </button>

                {/* Invoice rows */}
                {expanded && (
                  <div className="space-y-2">
                    {group.items.map((inv) => {
                      const invCfg = STATUS_CFG[getInvoiceStatus(inv)];
                      const hasJobItems = inv.treatmentSessions.some((s) =>
                        s.treatmentItems.some(
                          (ti) => (ti.item.commissionCategory?.jobs?.length ?? 0) > 0,
                        ),
                      );

                      return (
                        <div
                          key={inv.id}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card shadow-sm transition-colors ${
                            hasJobItems
                              ? "cursor-pointer hover:bg-muted/40 group"
                              : "opacity-70"
                          }`}
                          onClick={() => hasJobItems && setSelectedInvoice(inv)}
                        >
                          {/* Left: invoice info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">{inv.invoiceNo}</span>
                                <Link
                                  to={`/invoices/${inv.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {inv.customer.name} · {formatDate(inv.invoiceDate)}
                              </p>
                            </div>
                          </div>

                          {/* Right: amount + status + chevron */}
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="text-sm font-medium tabular-nums">
                              {formatCurrency(inv.grandTotal)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${invCfg.badge}`}
                            >
                              {invCfg.icon}{invCfg.label}
                            </span>
                            {hasJobItems && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Job Assignment Modal ─────────────────────────────────── */}
      {selectedInvoice && (
        <JobAssignmentModal
          inv={selectedInvoice}
          allEmployees={allEmployees}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: ["job-assignment-invoices"] });
          }}
          onNoteNeeded={(inv) => setNoteInvoice(inv)}
        />
      )}

      {/* ── Consultation Note Modal (muncul setelah job assignment disimpan) ── */}
      {noteInvoice && (
        <ConsultationNoteModal
          invoiceId={noteInvoice.id}
          invoiceNo={noteInvoice.invoiceNo}
          customerName={noteInvoice.customer.name}
          customerId={noteInvoice.customer.id}
          onClose={() => setNoteInvoice(null)}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: ["consultation-notes"] });
          }}
        />
      )}
    </div>
    </PageContainer>
  );
}
