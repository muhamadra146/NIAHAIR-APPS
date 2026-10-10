import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowLeft, Calculator, CheckCircle2, Loader2, AlertCircle,
  ChevronDown, ChevronRight, RefreshCw, Save,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast }    from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuthStore } from "@/stores/authStore";
import {
  fetchCommissionWorksheet,
  calculateCommissionWorksheet,
  finalizeCommission,
  type WorksheetTreatmentItem,
  type WorksheetJob,
  type WorksheetRow,
  type QtyOverrides,
  type AmountOverrides,
} from "@/features/invoice/api/commissionGenerate.api";
import { CommissionBreakdown } from "@/features/commission/components/CommissionBreakdown";
import { SPLIT_MODE_LABEL, type BreakdownInput } from "@/features/commission/commissionBreakdown";
import { CurrencyInput } from "@/components/ui/currency-input";

// ── Kalkulator Komisi ─────────────────────────────────────────────────
//
// Semua perhitungan dilakukan backend (POST /invoices/:id/commission-worksheet/calculate)
// — sumber yang sama dengan finalize & regenerate. Halaman ini hanya:
//   · menampilkan hasil + rincian perhitungan
//   · mengirim koreksi qty (qtyOverrides) untuk dihitung ulang
//   · mencatat koreksi nominal manual (amountOverrides)

const QTY_DEBOUNCE_MS = 400;
const AMOUNT_CORRECTION_ROLES = ["SUPER_ADMIN", "OWNER", "FINANCE"];

function toBreakdownInput(job: WorksheetJob, row: WorksheetRow, itemQty: number | null): BreakdownInput {
  return {
    role:            job.role,
    splitMode:       job.splitMode,
    unit:            job.unit,
    pricePerUnit:    job.pricePerUnit,
    commissionType:  row.commissionType,
    commissionValue: Number(row.commissionValue ?? 0),
    workQty:         row.workQty,
    workRatio:       row.workRatio,
    remainingBase:   row.remainingBase ?? job.remainingBase ?? row.itemBase,
    staffCount:      job.rows.length || 1,
    itemQty,
    effectiveBase:   row.effectiveBase,
    grossAmount:     row.grossAmount,
    flatDeduction:   row.flatDeduction,
    amount:          row.amount,
  };
}

// ── Sub-components ────────────────────────────────────────────────────

function WorkerAmountInput({
  value, onChange, locked,
}: { value: number; onChange: (v: number) => void; locked: boolean }) {
  return (
    <CurrencyInput
      prefix={false}
      disabled={locked}
      value={value}
      onChange={onChange}
      className="h-8 w-24 px-2 py-1 text-right text-sm sm:w-32"
    />
  );
}

function JobSection({
  job,
  itemQty,
  refQty,
  refJobName,
  amountMap,
  qtyMap,
  onAmountChange,
  onQtyChange,
  locked,
  amountLocked,
}: {
  job:            WorksheetJob;
  itemQty:        number | null;
  /** Total qty primary pertama (patokan untuk primary berikutnya, BY_QTY) */
  refQty:         number | null;
  refJobName:     string;
  amountMap:      AmountOverrides;
  qtyMap:         QtyOverrides;
  onAmountChange: (key: string, val: number) => void;
  onQtyChange:    (key: string, val: number) => void;
  locked:         boolean;
  /** true = role tidak boleh koreksi nominal manual (hanya SUPER_ADMIN/OWNER/FINANCE) */
  amountLocked:   boolean;
}) {
  const isHelper = job.role !== "PRIMARY";
  const byQty    = job.role === "PRIMARY" && job.splitMode === "BY_QTY";
  // Qty mempengaruhi komisi hanya untuk helper per unit & primary proporsional
  const qtyEditable = job.role === "HELPER_UNIT" || byQty;

  const jobTotal = job.rows.reduce(
    (s, r) => s + (amountMap[r.treatmentJobAssignmentId] ?? r.amount),
    0,
  );

  const totalQty   = job.rows.reduce((s, r) => s + (qtyMap[r.treatmentJobAssignmentId] ?? r.workQty), 0);
  const exceedsMax = byQty && itemQty !== null && totalQty > itemQty;
  const exceedsRef = byQty && refQty !== null && totalQty > refQty;

  const hasBaseDeduction =
    job.role === "PRIMARY" && (job.baseDeduction ?? 0) > 0 && job.remainingBase !== undefined;

  return (
    <div
      className={`rounded-lg border p-3 ${
        isHelper
          ? "border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/20"
          : "border-border bg-muted/30"
      }`}
    >
      {/* ── Job header ─────────────────────────────────────────── */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Calculator className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{job.jobName}</span>
          <Badge variant="outline" className="text-[10px]">{job.jobKey}</Badge>
          {isHelper ? (
            <Badge className="border-orange-200 bg-orange-100 text-[10px] text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300">
              helper
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">
              {SPLIT_MODE_LABEL[job.splitMode]}
            </Badge>
          )}
          {job.role === "HELPER_UNIT" && job.pricePerUnit !== null && (
            <span className="text-[11px] text-muted-foreground">
              @ {formatCurrency(job.pricePerUnit)}/{job.unit}
            </span>
          )}
          {byQty && itemQty !== null && (
            <span className={`text-[11px] font-medium ${exceedsMax ? "text-red-500" : "text-muted-foreground"}`}>
              Max: {itemQty} {job.unit}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-primary">{formatCurrency(jobTotal)}</span>
      </div>

      {exceedsMax && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Total {job.unit} ({totalQty}) melebihi qty invoice ({itemQty} {job.unit})</span>
        </div>
      )}

      {exceedsRef && !exceedsMax && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Total {job.jobName} ({totalQty} {job.unit}) melebihi {refJobName} ({refQty} {job.unit})</span>
        </div>
      )}

      {hasBaseDeduction && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
          <span>Sisa base:</span>
          <span className="font-medium text-foreground">{formatCurrency(job.remainingBase!)}</span>
          <span className="text-[10px]">(subtotal − potongan helper {formatCurrency(job.baseDeduction!)})</span>
        </div>
      )}

      {/* ── Workers ─────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {job.rows.map((row) => {
          const key      = row.treatmentJobAssignmentId;
          const val      = amountMap[key] ?? row.amount;
          const qty      = qtyMap[key] ?? row.workQty;
          const isManual = amountMap[key] !== undefined && amountMap[key] !== row.amount;

          return (
            <div key={key} className="flex items-start gap-2 rounded bg-background px-3 py-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="w-full truncate text-sm sm:w-auto">{row.employeeName}</span>

                  {qtyEditable && !locked ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => onQtyChange(key, Math.max(0, parseFloat(e.target.value) || 0))}
                        className={`w-20 rounded border bg-background px-2 py-0.5 text-right text-xs focus:outline-none focus:ring-1 ${
                          exceedsMax ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-ring"
                        }`}
                      />
                      <span className="text-[11px] text-muted-foreground">{job.unit}</span>
                    </div>
                  ) : (
                    job.role !== "HELPER_FLAT" && (
                      <Badge variant="secondary" className="text-[10px]">{qty} {job.unit}</Badge>
                    )
                  )}

                  {!row.hasRule && (
                    <span className="text-[10px] font-medium text-amber-600">belum ada tarif (rule karyawan / tarif job)</span>
                  )}
                  {row.hasRule && row.rateSource && (
                    <span className="text-[10px] text-muted-foreground">
                      {row.rateSource === "JOB" ? "tarif job" : "rule karyawan"}
                    </span>
                  )}
                </div>

                <CommissionBreakdown
                  input={toBreakdownInput(job, row, itemQty)}
                  manualNote={isManual ? `hitungan sistem ${formatCurrency(row.amount)}` : null}
                />
              </div>

              <div className="flex shrink-0 self-start items-center gap-2 pt-0.5">
                <WorkerAmountInput value={val} onChange={(v) => onAmountChange(key, v)} locked={locked || amountLocked} />
                {!locked && !amountLocked && isManual && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => onAmountChange(key, row.amount)}
                  >
                    reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TreatmentItemCard({
  item,
  amountMap,
  qtyMap,
  onAmountChange,
  onQtyChange,
  locked,
  amountLocked,
}: {
  item:           WorksheetTreatmentItem;
  amountMap:      AmountOverrides;
  qtyMap:         QtyOverrides;
  onAmountChange: (key: string, val: number) => void;
  onQtyChange:    (key: string, val: number) => void;
  locked:         boolean;
  /** true = role tidak boleh koreksi nominal manual (hanya SUPER_ADMIN/OWNER/FINANCE) */
  amountLocked:   boolean;
}) {
  const [open, setOpen] = useState(true);
  const totalForItem = item.jobs
    .flatMap((j) => j.rows)
    .reduce((s, r) => s + (amountMap[r.treatmentJobAssignmentId] ?? r.amount), 0);

  // Primary proporsional pertama = patokan qty untuk primary proporsional berikutnya
  const byQtyPrimaries = item.jobs.filter((j) => j.role === "PRIMARY" && j.splitMode === "BY_QTY");
  const firstPrimary   = byQtyPrimaries[0] ?? null;
  const firstPrimaryQty = firstPrimary
    ? firstPrimary.rows.reduce((s, r) => s + (qtyMap[r.treatmentJobAssignmentId] ?? r.workQty), 0)
    : null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <p className="font-medium">{item.itemName}</p>
            <p className="text-xs text-muted-foreground">
              Subtotal {formatCurrency(item.subtotal)} · {item.categoryName}
              {item.qty !== null && firstPrimary && (
                <span className="ml-1 font-medium">· {item.qty} {firstPrimary.unit} tersedia</span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Komisi</p>
          <p className="font-semibold text-primary">{formatCurrency(totalForItem)}</p>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          {item.jobs.map((job) => {
            const isSecondary = firstPrimary !== null &&
              job.role === "PRIMARY" && job.splitMode === "BY_QTY" &&
              job.commissionJobId !== firstPrimary.commissionJobId;

            return (
              <JobSection
                key={job.commissionJobId}
                job={job}
                itemQty={item.qty}
                refQty={isSecondary ? firstPrimaryQty : null}
                refJobName={isSecondary ? firstPrimary.jobName : ""}
                amountMap={amountMap}
                qtyMap={qtyMap}
                onAmountChange={onAmountChange}
                onQtyChange={onQtyChange}
                locked={locked}
                amountLocked={amountLocked}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function CommissionCalculatorPage() {
  const { id: invoiceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const roleCode = useAuthStore((st) => st.user?.roleCode) ?? "";
  // Koreksi nominal manual hanya untuk role override komisi (sama dengan backend)
  const canCorrectAmount = AMOUNT_CORRECTION_ROLES.includes(roleCode);

  // qtyMap: koreksi qty (dikirim ke backend untuk dihitung ulang)
  const [qtyMap, setQtyMap]       = useState<QtyOverrides>({});
  // amountMap: koreksi nominal manual
  const [amountMap, setAmountMap] = useState<AmountOverrides>({});
  // qty yang dikirim ke backend — di-debounce agar tidak request tiap ketikan
  const [debouncedQty, setDebouncedQty] = useState<QtyOverrides>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQty(qtyMap), QTY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [qtyMap]);

  const hasQtyOverride = Object.keys(debouncedQty).length > 0;
  // Qty diubah tapi belum dihitung ulang backend (masih dalam jeda debounce)
  const qtyPending     = qtyMap !== debouncedQty;

  const { data: ws, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["commission-worksheet", invoiceId, debouncedQty],
    queryFn:  () => hasQtyOverride
      ? calculateCommissionWorksheet(invoiceId!, debouncedQty)
      : fetchCommissionWorksheet(invoiceId!),
    enabled:  !!invoiceId,
    placeholderData: keepPreviousData,
  });

  const isLocked = useMemo(
    () => ws?.commissions.some((c) => c.status === "APPROVED" || c.status === "PAID") ?? false,
    [ws],
  );

  const allRows = useMemo(
    () => (ws?.treatmentItems ?? []).flatMap((ti) => ti.jobs.flatMap((j) => j.rows)),
    [ws],
  );

  function handleAmountChange(key: string, val: number) {
    setAmountMap((prev) => ({ ...prev, [key]: val }));
  }

  function handleQtyChange(key: string, val: number) {
    // Qty berubah → komisi dihitung ulang; koreksi nominal lama tidak relevan lagi
    setQtyMap((prev) => ({ ...prev, [key]: val }));
    setAmountMap({});
  }

  const grandTotalKomisi = allRows.reduce(
    (s, r) => s + (amountMap[r.treatmentJobAssignmentId] ?? r.amount),
    0,
  );

  const finalizeMut = useMutation({
    mutationFn: async () => {
      if (!invoiceId) return;
      // Kirim hanya koreksi nominal yang berbeda dari hitungan sistem
      const amountOverrides: AmountOverrides = {};
      for (const r of allRows) {
        const v = amountMap[r.treatmentJobAssignmentId];
        if (v !== undefined && v !== r.amount) amountOverrides[r.treatmentJobAssignmentId] = v;
      }
      return finalizeCommission(invoiceId, { qtyOverrides: qtyMap, amountOverrides });
    },
    onSuccess: (result) => {
      toast.success(`${result?.created ?? 0} komisi berhasil disimpan`);
      setQtyMap({});
      setAmountMap({});
      qc.invalidateQueries({ queryKey: ["commission-worksheet", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commission-generate-list"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Gagal menyimpan komisi";
      toast.error(msg);
    },
  });

  // ── Render ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !ws) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">Gagal memuat data worksheet komisi</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (ws.treatmentItems.length === 0) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Belum ada job yang di-assign</p>
            <p className="text-sm text-muted-foreground">
              Kembali ke Generate Komisi dan assign job terlebih dahulu.
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Invoice info */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold sm:text-2xl">Kalkulator Komisi</h1>
            <p className="text-sm text-muted-foreground">
              {ws.invoiceNo} · {ws.customer.name}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Grand Total Invoice</p>
            <p className="text-base font-semibold">
              {formatCurrency(parseFloat(ws.grandTotal))}
            </p>
          </div>
        </div>

        {isLocked && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">Komisi sudah disetujui/dibayar — tidak bisa diubah</span>
          </div>
        )}

        {!isLocked && ws.commissions.some((c) => c.status === "PENDING") && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm">
              Ada komisi PENDING — submit akan menggantikan data lama
            </span>
          </div>
        )}
      </div>

      {/* Calculator items */}
      {ws.treatmentItems.map((ti) => (
        <TreatmentItemCard
          key={ti.treatmentItemId}
          item={ti}
          amountMap={amountMap}
          qtyMap={qtyMap}
          onAmountChange={handleAmountChange}
          onQtyChange={handleQtyChange}
          locked={isLocked}
          amountLocked={!canCorrectAmount}
        />
      ))}

      {/* Summary + Submit */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="font-medium">Total Semua Komisi</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(grandTotalKomisi)}
          </span>
        </div>

        {!isLocked && (
          <Button
            className="w-full"
            disabled={finalizeMut.isPending || isFetching || qtyPending || allRows.length === 0}
            onClick={() => finalizeMut.mutate()}
          >
            {finalizeMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Komisi
              </>
            )}
          </Button>
        )}
      </div>
    </div>
    </PageContainer>
  );
}
