import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Ban,
  AlertCircle, ExternalLink, RefreshCw, Lock, X, Loader2, ClipboardList,
  Search, Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button }        from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton }      from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast }         from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore }  from "@/stores/authStore";
import { useEmployees }  from "@/features/employee/hooks";
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

// ── Days ago badge ────────────────────────────────────────────────────

function DaysAgoBadge({ dateStr }: { dateStr: string }) {
  const dateOnly = dateStr.slice(0, 10);
  const days = Math.floor((Date.now() - new Date(dateOnly + "T12:00:00").getTime()) / 86_400_000);
  if (days === 0) return <span className="text-xs text-muted-foreground">Hari ini</span>;
  if (days === 1) return <span className="text-xs text-amber-600 font-medium">Kemarin</span>;
  if (days <= 3)  return <span className="text-xs text-amber-600 font-medium">{days} hari lalu</span>;
  return <span className="text-xs text-red-500 font-medium">{days} hari lalu</span>;
}

// ── hasJobItems helper ────────────────────────────────────────────────

function hasJobItems(inv: JobAssignmentInvoice): boolean {
  return inv.treatmentSessions.some((s) =>
    s.treatmentItems.some((ti) => (ti.item.commissionCategory?.jobs?.length ?? 0) > 0),
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export function GenerateKomisiPage() {
  const qc = useQueryClient();
  const { branchId } = useAuthStore();

  const [tab,             setTab]             = useState<"pending" | "tanggal">("pending");
  const [pendingSearch,   setPendingSearch]   = useState("");
  const [date,            setDate]            = useState(todayStr);
  const [dateSearch,      setDateSearch]      = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<JobAssignmentInvoice | null>(null);
  const [noteInvoice,     setNoteInvoice]     = useState<JobAssignmentInvoice | null>(null);

  const isToday   = date === todayStr();
  const dateLabel = isToday ? "Hari Ini" : formatDateLabel(date);

  // Tab "Belum Diisi" — 90 hari ke belakang
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: pendingInvoices = [], isLoading: loadingPending } = useQuery({
    queryKey:       ["job-assignment-invoices", "pending-all", branchId],
    queryFn:        () => fetchJobAssignmentInvoices({ branchId: branchId ?? undefined, startDate: ninetyDaysAgo }),
    staleTime:      0,
    refetchOnMount: true,
    enabled:        tab === "pending",
  });

  const unprocessed = useMemo(() => {
    const q = pendingSearch.toLowerCase();
    return pendingInvoices
      .filter((i) => getInvoiceStatus(i) === "belum" || getInvoiceStatus(i) === "terisi")
      .filter((i) => !q || i.customer.name.toLowerCase().includes(q) || i.invoiceNo.toLowerCase().includes(q))
      .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
  }, [pendingInvoices, pendingSearch]);

  // Tab "Per Tanggal"
  const { data: dateInvoices = [], isLoading: loadingDate, isFetching, refetch: refetchDate } = useQuery({
    queryKey:       ["job-assignment-invoices", date, branchId],
    queryFn:        () => fetchJobAssignmentInvoices({ startDate: date, endDate: date, branchId: branchId ?? undefined }),
    staleTime:      0,
    refetchOnMount: true,
    enabled:        tab === "tanggal",
  });

  const filteredDateInvoices = useMemo(() => {
    const q = dateSearch.toLowerCase();
    if (!q) return dateInvoices;
    return dateInvoices.filter(
      (i) => i.customer.name.toLowerCase().includes(q) || i.invoiceNo.toLowerCase().includes(q),
    );
  }, [dateInvoices, dateSearch]);

  const { data: empData } = useEmployees({ isActive: true, limit: 200 });
  const allEmployees = useMemo(() => empData?.data ?? [], [empData]);

  function handleSuccess() {
    void qc.invalidateQueries({ queryKey: ["job-assignment-invoices"] });
  }

  // ── Table header ──────────────────────────────────────────────────────
  function TableHead() {
    return (
      <thead>
        <tr className="border-b border-border bg-muted/40">
          <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Invoice</th>
          <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Pelanggan</th>
          <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide hidden sm:table-cell">Tanggal</th>
          <th className="px-4 py-2.5 text-center font-semibold text-foreground/70 text-xs uppercase tracking-wide">Status</th>
          <th className="px-4 py-2.5 text-right font-semibold text-foreground/70 text-xs uppercase tracking-wide">Aksi</th>
        </tr>
      </thead>
    );
  }

  // ── Table row ─────────────────────────────────────────────────────────
  function InvoiceTableRow({ inv, showIsiButton = false }: { inv: JobAssignmentInvoice; showIsiButton?: boolean }) {
    const status = getInvoiceStatus(inv);
    const cfg    = STATUS_CFG[status];
    const canFill = hasJobItems(inv);

    return (
      <tr
        className={`hover:bg-muted/20 transition-colors group ${canFill && !showIsiButton ? "cursor-pointer" : ""}`}
        onClick={() => { if (canFill && !showIsiButton) setSelectedInvoice(inv); }}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium font-mono text-foreground">{inv.invoiceNo}</span>
            <Link to={`/invoices/${inv.id}`} onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">{formatCurrency(inv.grandTotal)}</div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{inv.customer.name}</div>
          {inv.customer.mobilePhone && (
            <div className="text-xs text-muted-foreground">{inv.customer.mobilePhone}</div>
          )}
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="text-sm text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
          <DaysAgoBadge dateStr={inv.invoiceDate} />
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
            {cfg.icon}{cfg.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          {showIsiButton ? (
            canFill ? (
              <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => setSelectedInvoice(inv)}>
                Isi Sekarang
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Tidak ada job</span>
            )
          ) : (
            canFill && (
              <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSelectedInvoice(inv)}>
                  Isi <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}
        </td>
      </tr>
    );
  }

  return (
    <PageContainer title="Input Job" subtitle="Isi pengerjaan & kalkulasi komisi">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "tanggal")}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <ClipboardList className="w-4 h-4" /> Belum Diisi
            {unprocessed.length > 0 && tab !== "pending" && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
                {unprocessed.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tanggal" className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Per Tanggal
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Belum Diisi ─────────────────────────────────── */}
        <TabsContent value="pending">
          <>
            {/* Search */}
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama klien atau no. invoice..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Summary */}
            {!loadingPending && (
              <div className="flex items-center gap-2 text-sm mb-4 text-muted-foreground">
                {unprocessed.length > 0 ? (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />{unprocessed.length} invoice belum diisi komisi
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Semua sudah diisi
                  </span>
                )}
              </div>
            )}

            {/* Skeleton */}
            {loadingPending && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            )}

            {/* Empty */}
            {!loadingPending && unprocessed.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm font-medium text-green-600">Semua pengerjaan sudah diisi!</p>
                <p className="text-xs">
                  {pendingSearch ? "Tidak ada invoice yang cocok dengan pencarian." : "Tidak ada invoice yang perlu diisi dalam 90 hari terakhir."}
                </p>
              </div>
            )}

            {/* Table */}
            {!loadingPending && unprocessed.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <TableHead />
                  <tbody className="divide-y divide-border/60">
                    {unprocessed.map((inv) => (
                      <InvoiceTableRow key={inv.id} inv={inv} showIsiButton />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        </TabsContent>

        {/* ── Tab: Per Tanggal ─────────────────────────────────── */}
        <TabsContent value="tanggal">
          <>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama klien atau invoice..."
                  value={dateSearch}
                  onChange={(e) => setDateSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Date navigator */}
              <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm overflow-hidden shrink-0">
                <button type="button"
                  className="flex items-center px-2.5 py-2 hover:bg-muted/40 transition-colors"
                  onClick={() => setDate((d) => shiftDate(d, -1))}>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2 px-3 py-2 border-x border-input">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input type="date" value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm bg-transparent focus:outline-none" />
                </div>
                <button type="button"
                  className="flex items-center px-2.5 py-2 hover:bg-muted/40 transition-colors"
                  onClick={() => setDate((d) => shiftDate(d, 1))}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {!isToday && (
                <button type="button"
                  className="text-xs text-primary underline shrink-0"
                  onClick={() => setDate(todayStr())}>
                  Hari Ini
                </button>
              )}

              <button type="button"
                className="p-1.5 rounded-lg border hover:bg-muted transition-colors shrink-0"
                onClick={() => void refetchDate()} disabled={loadingDate || isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loadingDate || isFetching ? "animate-spin" : ""}`} />
              </button>

              {dateSearch && (
                <button type="button"
                  onClick={() => setDateSearch("")}
                  className="text-xs text-muted-foreground hover:text-foreground underline shrink-0">
                  Reset
                </button>
              )}
            </div>

            {/* Label tanggal */}
            <p className="text-sm text-muted-foreground mb-3">{dateLabel}</p>

            {/* Skeleton */}
            {loadingDate ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b bg-muted/40 h-10" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24 hidden sm:block" />
                    <Skeleton className="h-4 w-20 hidden sm:block ml-auto" />
                  </div>
                ))}
              </div>
            ) : filteredDateInvoices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <Ban className="h-8 w-8" />
                <p className="text-sm">
                  {dateSearch ? "Tidak ada invoice yang cocok." : "Tidak ada invoice PAID pada tanggal ini."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <TableHead />
                  <tbody className="divide-y divide-border/60">
                    {filteredDateInvoices.map((inv) => (
                      <InvoiceTableRow key={inv.id} inv={inv} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        </TabsContent>
      </Tabs>

      {/* ── Job Assignment Modal ─────────────────────────────────── */}
      {selectedInvoice && (
        <JobAssignmentModal
          inv={selectedInvoice}
          allEmployees={allEmployees}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={handleSuccess}
          onNoteNeeded={(inv) => setNoteInvoice(inv)}
        />
      )}

      {/* ── Consultation Note Modal ──────────────────────────────── */}
      {noteInvoice && (
        <ConsultationNoteModal
          invoiceId={noteInvoice.id}
          invoiceNo={noteInvoice.invoiceNo}
          customerName={noteInvoice.customer.name}
          customerId={noteInvoice.customer.id}
          onClose={() => setNoteInvoice(null)}
          onSuccess={() => { void qc.invalidateQueries({ queryKey: ["consultation-notes"] }); }}
        />
      )}
    </PageContainer>
  );
}
