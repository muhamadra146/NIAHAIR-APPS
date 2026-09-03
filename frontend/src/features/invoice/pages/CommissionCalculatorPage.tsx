import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  fetchCommissionWorksheet,
  finalizeCommission,
  type WorksheetTreatmentItem,
  type FinalizeCommissionRow,
} from "@/features/invoice/api/commissionGenerate.api";

// ── Types ─────────────────────────────────────────────────────────────

/** Per-worker row in the calculator */
type CalcRow = {
  treatmentJobAssignmentId: string;
  employeeId:               string;
  employeeName:             string;
  workQty:                  number | null;
  /** Pre-filled commission amount from chain calculation */
  amount:                   number;
  /** Effective base for this worker after chain deduction (used in finalize) */
  effectiveBase:            number;
  commissionRuleId:         string | null;
  commissionType:           string;
  commissionValue:          string;
  commissionBase:           string;
  /** Full item base from backend (raw, pre-chain fallback) */
  baseAmount:               number;
  workRatio:                number | null;
};

type CalcJob = {
  commissionJobId:  string;
  jobName:          string;
  jobKey:           string;
  sortOrder:        number;
  /** null = primary job; set = helper (deducts from the target job) */
  deductsFromJobId: string | null;
  /** Default price/unit for PERCENTAGE helpers; null = primary or FLAT */
  pricePerUnit:     number | null;
  /** Satuan unit: "helai", "sesi", "cm", dll. */
  unit:             string;
  /** Primary only: remaining base after all helper deductions */
  remainingBase?:   number;
  rows:             CalcRow[];
};

type CalcItem = {
  treatmentItemId: string;
  itemName:        string;
  subtotal:        number;
  /** Qty dari invoice item — batas maksimum total workQty primary workers */
  itemQty:         number | null;
  categoryName:    string;
  jobs:            CalcJob[];
};

/** key: treatmentJobAssignmentId → manual override amount */
type AmountMap = Record<string, number>;
/** key: treatmentJobAssignmentId → workQty override (untuk helper PERCENTAGE) */
type QtyMap    = Record<string, number>;

// ── Chain Calculation ─────────────────────────────────────────────────

/**
 * calcChainAmounts — core chain deduction logic for one treatment item.
 *
 * Business rules applied:
 *  · PERCENTAGE helper (pricePerUnit > 0):
 *    effectiveBase = workQty × pricePerUnit
 *    → deducts effectiveBase from primary's totalBase before computing primary commission
 *    → helper earns effectiveBase × rate% (CommissionRule worker) — sama seperti primary
 *  · FLAT helper (FIXED commissionType): earns fixed rupiah amount
 *    → deducts that flat amount directly from primary's final commission
 *  · Multiple primaries: base & flat deductions split equally among them
 *  · Multiple PERCENTAGE helpers for same primary: each deducts own (qty × price)
 */
function calcChainAmounts(
  ti:     WorksheetTreatmentItem,
  qtyMap: QtyMap,
): CalcJob[] {
  const totalBase   = parseFloat(ti.subtotal) || 0;
  const helperJobs  = ti.jobs.filter(j => j.deductsFromJobId !== null);
  const primaryJobs = ti.jobs.filter(j => j.deductsFromJobId === null);

  // Accumulate deductions per primary job id:
  //   base — deducted from item subtotal before computing primary commission rate
  //   flat — deducted from primary's final commission amount directly
  const dedMap: Record<string, { base: number; flat: number }> = {};

  // ── Phase 1: helper jobs ──────────────────────────────────────────
  const processedHelpers: CalcJob[] = helperJobs.map(job => {
    const targetId    = job.deductsFromJobId!;
    const pricePerUnit = job.pricePerUnit ?? 0;

    const rows: CalcRow[] = job.workers.map(w => {
      // qtyMap override — user can edit workQty in the calculator
      const workQty     = qtyMap[w.treatmentJobAssignmentId] ?? w.workQty ?? 0;
      const val         = parseFloat(w.commissionValue ?? "0") || 0;
      let amount        = 0;
      let effectiveBase = 0;

      if (pricePerUnit > 0) {
        // PERCENTAGE helper: effectiveBase = workQty × pricePerUnit
        // Komisi worker = effectiveBase × rate% (dari CommissionRule karyawan) — sama seperti primary.
        // Deduction ke primary = effectiveBase (bukan amount), bukan rate% dari primary.
        effectiveBase = workQty * pricePerUnit;
        if (w.commissionType === "PERCENTAGE") {
          amount = Math.round(effectiveBase * val / 100);
        } else {
          // Jika worker punya FIXED rule, pakai nominal flat dari CommissionRule
          amount = Math.round(val);
        }
        dedMap[targetId] ??= { base: 0, flat: 0 };
        dedMap[targetId].base += effectiveBase; // potong full effectiveBase dari base primary
      } else {
        // FLAT helper (pricePerUnit null/0): potongan flat langsung dari komisi primary
        // Gunakan CommissionRule.commissionValue (nominal rupiah) dari worker
        amount = Math.round(val);
        if (amount > 0) {
          dedMap[targetId] ??= { base: 0, flat: 0 };
          dedMap[targetId].flat += amount;      // potong dari komisi akhir primary
        }
      }

      return {
        treatmentJobAssignmentId: w.treatmentJobAssignmentId,
        employeeId:               w.employeeId,
        employeeName:             w.employeeName,
        workQty:                  workQty,
        amount,
        effectiveBase,
        commissionRuleId:         w.commissionRuleId,
        commissionType:           w.commissionType ?? "PERCENTAGE",
        commissionValue:          w.commissionValue ?? "0",
        commissionBase:           w.commissionBase ?? "AFTER_DISCOUNT",
        baseAmount:               w.baseAmount,
        workRatio:                null,
      };
    });

    return {
      commissionJobId:  job.commissionJobId,
      jobName:          job.jobName,
      jobKey:           job.jobKey,
      sortOrder:        job.sortOrder,
      deductsFromJobId: job.deductsFromJobId,
      pricePerUnit:     job.pricePerUnit,
      unit:             job.unit ?? "helai",
      rows,
    };
  });

  // ── Phase 2: primary jobs ─────────────────────────────────────────
  // Total helai item dari invoice (qty × conversionSnapshot, sudah di-resolve backend)
  const itemTotalHelai = ti.qty ?? 0;

  const processedPrimaries: CalcJob[] = primaryJobs.map(job => {
    const ded           = dedMap[job.commissionJobId] ?? { base: 0, flat: 0 };
    const remainingBase = Math.max(0, totalBase - ded.base);
    const n             = job.workers.length || 1;

    // Hitung workQty efektif per worker (pakai qtyMap override jika ada)
    const workerWithQty = job.workers.map(w => ({
      ...w,
      effectiveQty: qtyMap[w.treatmentJobAssignmentId] ?? w.workQty ?? 0,
    }));
    const totalWorkQty = workerWithQty.reduce((sum, w) => sum + w.effectiveQty, 0);

    const rows: CalcRow[] = workerWithQty.map(w => {
      const val = parseFloat(w.commissionValue ?? "0") || 0;

      // Proporsi = workQty worker / total helai item (bukan / total workers qty)
      // Contoh: 90 helai dari 180 total → dapat 50% dari sisa base
      // Fallback: jika tidak ada itemTotalHelai, proporsional antar worker; jika qty semua 0, bagi rata
      const ratio = itemTotalHelai > 0
        ? w.effectiveQty / itemTotalHelai
        : totalWorkQty > 0
          ? w.effectiveQty / totalWorkQty
          : 1 / n;

      const workerBase = remainingBase * ratio;
      const workerFlat = ded.flat * ratio;

      let amount = 0;
      if (w.commissionType === "PERCENTAGE") {
        amount = Math.round(Math.max(0, workerBase * val / 100 - workerFlat));
      } else if (w.commissionType === "FIXED") {
        // FIXED: flat amount penuh per worker (tidak proporsional qty)
        amount = Math.round(Math.max(0, val - workerFlat));
      }

      return {
        treatmentJobAssignmentId: w.treatmentJobAssignmentId,
        employeeId:               w.employeeId,
        employeeName:             w.employeeName,
        workQty:                  w.effectiveQty,
        amount,
        effectiveBase:            workerBase,
        commissionRuleId:         w.commissionRuleId,
        commissionType:           w.commissionType ?? "PERCENTAGE",
        commissionValue:          w.commissionValue ?? "0",
        commissionBase:           w.commissionBase ?? "AFTER_DISCOUNT",
        baseAmount:               w.baseAmount,
        workRatio:                ratio,
      };
    });

    return {
      commissionJobId:  job.commissionJobId,
      jobName:          job.jobName,
      jobKey:           job.jobKey,
      sortOrder:        job.sortOrder,
      deductsFromJobId: null,
      pricePerUnit:     null,
      unit:             job.unit ?? "helai",
      remainingBase,
      rows,
    };
  });

  // Merge, sort by sortOrder (display order from job config)
  return [...processedPrimaries, ...processedHelpers]
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// ── Sub-components ────────────────────────────────────────────────────

function WorkerAmountInput({
  value, onChange, locked,
}: { value: number; onChange: (v: number) => void; locked: boolean }) {
  return (
    <input
      type="number"
      min={0}
      disabled={locked}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
      className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-32"
    />
  );
}

function JobSection({
  job,
  treatmentItemId,
  amountMap,
  qtyMap,
  onAmountChange,
  onQtyChange,
  locked,
  itemQty,
  refQty,
  refJobName,
}: {
  job:             CalcJob;
  treatmentItemId: string;
  amountMap:       AmountMap;
  qtyMap:          QtyMap;
  onAmountChange:  (key: string, val: number) => void;
  onQtyChange:     (key: string, val: number) => void;
  locked:          boolean;
  itemQty:         number | null;
  /** Total helai primary job pertama (patokan untuk secondary primaries) */
  refQty:          number | null;
  /** Nama primary job pertama (untuk pesan warning) */
  refJobName:      string;
}) {
  // Suppress unused variable warning
  void treatmentItemId;

  const jobTotal = job.rows.reduce(
    (s, r) => s + (amountMap[r.treatmentJobAssignmentId] ?? r.amount),
    0,
  );

  const isHelper           = job.deductsFromJobId !== null;
  // PERCENTAGE helper = helper dengan pricePerUnit (ditentukan dari CommissionJob, bukan CommissionRule worker)
  const isPercentageHelper = isHelper && job.pricePerUnit !== null && job.pricePerUnit > 0;

  // Show remaining base hint only when helpers have actually reduced the primary's base
  const hasBaseDeduction =
    !isHelper &&
    job.remainingBase !== undefined &&
    job.rows.length > 0 &&
    job.remainingBase < (job.rows[0]?.baseAmount ?? Infinity);

  // Primary: validate total workQty against item qty
  const totalPrimaryQty = !isHelper
    ? job.rows.reduce((sum, r) => {
        const qty = qtyMap[r.treatmentJobAssignmentId] ?? r.workQty ?? 0;
        return sum + qty;
      }, 0)
    : 0;
  const exceedsMax = !isHelper && itemQty !== null && totalPrimaryQty > itemQty;
  // Secondary primary: total helai tidak boleh melebihi primary job pertama (pasang rambut)
  const exceedsRef = !isHelper && refQty !== null && totalPrimaryQty > refQty;

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
          {isHelper && (
            <Badge className="border-orange-200 bg-orange-100 text-[10px] text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300">
              helper
            </Badge>
          )}
          {/* PERCENTAGE helper: tampilkan harga/unit sebagai info (read-only) */}
          {isPercentageHelper && job.pricePerUnit !== null && (
            <span className="text-[11px] text-muted-foreground">
              @ Rp {job.pricePerUnit.toLocaleString("id-ID")}/{job.unit}
            </span>
          )}
          {/* Primary: tampilkan max qty dari invoice */}
          {!isHelper && itemQty !== null && (
            <span className={`text-[11px] font-medium ${exceedsMax ? "text-red-500" : "text-muted-foreground"}`}>
              Max: {itemQty} {job.unit}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-primary">{formatCurrency(jobTotal)}</span>
      </div>

      {/* ── Primary: max qty exceeded warning ─────────────────── */}
      {exceedsMax && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>
            Total helaian ({totalPrimaryQty}) melebihi qty invoice ({itemQty} {job.unit})
          </span>
        </div>
      )}

      {/* ── Secondary primary: melebihi primary pertama (pasang rambut) ── */}
      {exceedsRef && !exceedsMax && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>
            Total {job.jobName} ({totalPrimaryQty} helai) melebihi {refJobName} ({refQty} helai)
          </span>
        </div>
      )}

      {/* ── Primary: remaining base after helper deductions ────── */}
      {hasBaseDeduction && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
          <span>Sisa base:</span>
          <span className="font-medium text-foreground">
            {formatCurrency(job.remainingBase!)}
          </span>
          <span className="text-[10px]">(setelah potongan helper)</span>
        </div>
      )}

      {/* ── Workers ─────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {job.rows.map((row) => {
          const key = row.treatmentJobAssignmentId;
          const val = amountMap[key] ?? row.amount;

          return (
            <div
              key={key}
              className="flex items-start gap-2 rounded bg-background px-3 py-2"
            >
              {/* Kiri: nama + info — flex-1 agar nama panjang wrap ke baris sendiri */}
              <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <span className="w-full truncate text-sm sm:w-auto">{row.employeeName}</span>

                {/* workQty display — berbeda untuk primary vs helper */}
                {isPercentageHelper ? (
                  /* PERCENTAGE helper: editable qty + effectiveBase display */
                  <div className="flex flex-wrap items-center gap-1.5">
                    {locked ? (
                      <span className="text-xs font-medium text-orange-600">
                        {qtyMap[key] ?? row.workQty ?? 0} {job.unit}
                      </span>
                    ) : (
                      <>
                        <input
                          type="number"
                          min={0}
                          value={qtyMap[key] ?? row.workQty ?? 0}
                          onChange={(e) => onQtyChange(key, Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-16 rounded border border-orange-300 bg-background px-2 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 dark:border-orange-700 sm:w-20"
                        />
                        <span className="text-[11px] text-muted-foreground">{job.unit}</span>
                      </>
                    )}
                    {/* Tampilkan effectiveBase */}
                    {row.effectiveBase > 0 && (
                      <span className="text-xs text-orange-400">
                        = {formatCurrency(row.effectiveBase)}
                      </span>
                    )}
                  </div>
                ) : !isHelper ? (
                  /* Primary: editable workQty — untuk tracking (tidak mempengaruhi komisi) */
                  <div className="flex flex-wrap items-center gap-1.5">
                    {locked ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {qtyMap[key] ?? row.workQty ?? 0} {job.unit}
                      </span>
                    ) : (
                      <>
                        <input
                          type="number"
                          min={0}
                          value={qtyMap[key] ?? row.workQty ?? ""}
                          placeholder="0"
                          onChange={(e) => onQtyChange(key, Math.max(0, parseFloat(e.target.value) || 0))}
                          className={`w-20 rounded border px-2 py-0.5 text-right text-xs focus:outline-none focus:ring-1 bg-background ${
                            exceedsMax
                              ? "border-red-400 focus:ring-red-400"
                              : "border-border focus:ring-ring"
                          }`}
                        />
                        <span className="text-[11px] text-muted-foreground">{job.unit}</span>
                      </>
                    )}
                  </div>
                ) : (
                  /* FLAT helper: read-only badge */
                  row.workQty !== null && (
                    <Badge variant="secondary" className="text-[10px]">
                      {row.workQty} {job.unit}
                    </Badge>
                  )
                )}

                {/* Commission rate label — hanya tampil untuk primary (PERCENTAGE) dan FLAT helper */}
                {row.commissionType === "PERCENTAGE" && !isPercentageHelper && (
                  <span className="text-[10px] text-muted-foreground">
                    {row.commissionValue}%
                  </span>
                )}
                {row.commissionType === "FIXED" && (
                  <span className="text-[10px] text-muted-foreground">flat</span>
                )}
              </div>

              {/* Kanan: amount input — shrink-0 + self-start agar selalu di kanan atas */}
              <div className="flex shrink-0 self-start items-center gap-2 pt-0.5">
                <WorkerAmountInput
                  value={val}
                  onChange={(v) => onAmountChange(key, v)}
                  locked={locked}
                />
                {!locked && (
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
  onPrimaryQtyChange,
  locked,
}: {
  item:                CalcItem;
  amountMap:           AmountMap;
  qtyMap:              QtyMap;
  onAmountChange:      (key: string, val: number) => void;
  onQtyChange:         (key: string, val: number) => void;
  onPrimaryQtyChange:  (key: string, val: number) => void;
  locked:              boolean;
}) {
  const [open, setOpen] = useState(true);
  const totalForItem = item.jobs
    .flatMap((j) => j.rows)
    .reduce((s, r) => s + (amountMap[r.treatmentJobAssignmentId] ?? r.amount), 0);

  // Primary job pertama (sortOrder terkecil, deductsFromJobId = null) = "pasang rambut"
  const primaryJobs     = item.jobs.filter((j) => j.deductsFromJobId === null);
  const firstPrimary    = primaryJobs[0] ?? null;
  // Total helai dikerjakan oleh primary pertama (live, berdasar qtyMap)
  const firstPrimaryQty = firstPrimary
    ? firstPrimary.rows.reduce(
        (sum, r) => sum + (qtyMap[r.treatmentJobAssignmentId] ?? r.workQty ?? 0),
        0,
      )
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
              {item.itemQty !== null && (
                <span className="ml-1 font-medium">· {item.itemQty} helai tersedia</span>
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
            // Secondary primary = primary bukan yang pertama → pakai pasang rambut sebagai patokan
            const isSecondaryPrimary =
              job.deductsFromJobId === null &&
              job.commissionJobId !== firstPrimary?.commissionJobId;

            return (
              <JobSection
                key={job.commissionJobId}
                job={job}
                treatmentItemId={item.treatmentItemId}
                amountMap={amountMap}
                qtyMap={qtyMap}
                onAmountChange={onAmountChange}
                onQtyChange={job.deductsFromJobId !== null ? onQtyChange : onPrimaryQtyChange}
                locked={locked}
                itemQty={item.itemQty}
                refQty={isSecondaryPrimary ? firstPrimaryQty : null}
                refJobName={isSecondaryPrimary ? (firstPrimary?.jobName ?? "") : ""}
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

  const { data: ws, isLoading, isError, refetch } = useQuery({
    queryKey: ["commission-worksheet", invoiceId],
    queryFn:  () => fetchCommissionWorksheet(invoiceId!),
    enabled:  !!invoiceId,
  });

  // amountMap: user manual overrides — keyed by treatmentJobAssignmentId
  const [amountMap, setAmountMap] = useState<AmountMap>({});
  // qtyMap: workQty overrides untuk PERCENTAGE helper
  //   key: treatmentJobAssignmentId
  const [qtyMap, setQtyMap] = useState<QtyMap>({});

  // Derived: chain-calculated jobs per treatment item
  // Recomputes automatically when ws or qtyMap changes
  const calcItems = useMemo<CalcItem[]>(() => {
    if (!ws) return [];
    return ws.treatmentItems.map(ti => ({
      treatmentItemId: ti.treatmentItemId,
      itemName:        ti.itemName,
      subtotal:        parseFloat(ti.subtotal) || 0,
      itemQty:         ti.qty ?? null,
      categoryName:    ti.categoryName,
      jobs:            calcChainAmounts(ti, qtyMap),
    }));
  }, [ws, qtyMap]);

  const isLocked = useMemo(
    () => ws?.commissions.some((c) => c.status === "APPROVED" || c.status === "PAID") ?? false,
    [ws],
  );

  function handleAmountChange(key: string, val: number) {
    setAmountMap((prev) => ({ ...prev, [key]: val }));
  }

  function handleQtyChange(key: string, val: number) {
    // Changing HELPER workQty invalidates manual amount overrides —
    // clear amountMap so chain-calculated amounts show fresh values
    setQtyMap((prev) => ({ ...prev, [key]: val }));
    setAmountMap({});
  }

  function handlePrimaryQtyChange(key: string, val: number) {
    // Primary workQty is for tracking only (doesn't affect commission formula).
    // Only update qtyMap; amountMap stays intact.
    setQtyMap((prev) => ({ ...prev, [key]: val }));
  }

  const grandTotalKomisi = calcItems
    .flatMap((ci) => ci.jobs.flatMap((j) => j.rows))
    .reduce((s, r) => s + (amountMap[r.treatmentJobAssignmentId] ?? r.amount), 0);

  const finalizeMut = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !ws) return;

      const rows: FinalizeCommissionRow[] = calcItems.flatMap((ci) =>
        ci.jobs.flatMap((job) =>
          job.rows.map((row) => ({
            treatmentJobAssignmentId: row.treatmentJobAssignmentId,
            commissionAmount:         amountMap[row.treatmentJobAssignmentId] ?? row.amount,
            commissionRuleId:         row.commissionRuleId,
            commissionType:           row.commissionType,
            commissionValue:          row.commissionValue,
            commissionBase:           row.commissionBase,
            // Use chain-computed effective base for accurate audit trail;
            // fall back to raw baseAmount when effectiveBase is 0 (FLAT helper)
            baseAmount:               row.effectiveBase > 0 ? row.effectiveBase : row.baseAmount,
            // Use qtyMap override if user changed workQty in calculator
            workQty:                  qtyMap[row.treatmentJobAssignmentId] !== undefined
              ? qtyMap[row.treatmentJobAssignmentId]
              : row.workQty,
            workRatio:                row.workRatio,
            notes:                    null,
          })),
        ),
      );

      return finalizeCommission(invoiceId, { rows });
    },
    onSuccess: (result) => {
      toast.success(`${result?.created ?? 0} komisi berhasil disimpan`);
      qc.invalidateQueries({ queryKey: ["commission-worksheet", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commission-generate-list"] });
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

  if (calcItems.length === 0) {
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
          <RefreshCw className="h-4 w-4" />
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
      {calcItems.map((ci) => (
        <TreatmentItemCard
          key={ci.treatmentItemId}
          item={ci}
          amountMap={amountMap}
          qtyMap={qtyMap}
          onAmountChange={handleAmountChange}
          onQtyChange={handleQtyChange}
          onPrimaryQtyChange={handlePrimaryQtyChange}
          locked={isLocked}
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
            disabled={
              finalizeMut.isPending ||
              calcItems.flatMap((ci) => ci.jobs.flatMap((j) => j.rows)).length === 0
            }
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
