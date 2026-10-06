const { Prisma } = require("@prisma/client");

const D = (v) => new Prisma.Decimal(String(v));

// ── Timezone ──────────────────────────────────────────────────────────
// WIB = UTC+7. Semua perbandingan tanggal pakai WIB agar treatment jam 8 malam
// tidak terhitung "hari berikutnya" hanya karena konversi UTC.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function toWIBDateString(date) {
  const wibMs = new Date(date).getTime() + WIB_OFFSET_MS;
  return new Date(wibMs).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function isSameDayWIB(dateA, dateB) {
  return toWIBDateString(dateA) === toWIBDateString(dateB);
}

// ── workQty helpers ───────────────────────────────────────────────────

function sumWorkQty(assignments) {
  return assignments.reduce((acc, a) => acc.plus(D(a.workQty)), D(0));
}

// ── Komisi individual (untuk referensi / single-assignment) ───────────
function calcCommissionAmount(baseAmount, workRatio, commissionValue) {
  return D(baseAmount).mul(D(workRatio)).mul(D(commissionValue).div(100));
}

// ── Distribusi pool dengan jaminan rounding ───────────────────────────
//
// MASALAH: 3 orang bagi Rp 17.500 sama rata → masing-masing 5833.33 (round half-up)
//          sum = 17.499,99 ≠ 17.500. Satu rupiah hilang.
//
// SOLUSI: Hitung pool total sekali (ROUND_HALF_UP ke 2dp),
//         bagi ke N-1 orang terlebih dahulu (ROUND_DOWN = truncate),
//         orang terakhir dapat sisa (pool - distributed).
//         Jaminan: sum(result) === pool. Exact.
//
// Siapa dapat sisa rupiah? Orang TERAKHIR dalam array assignments.
// Untuk konsistensi, urutkan assignments by workQty desc sebelum memanggil
// fungsi ini jika ingin sisa ke yang kerja paling banyak.
//
// @param {Decimal|string|number} pool  total yang akan dibagi
// @param {Array<{workQty}>}      assignments
// @returns {Decimal[]} panjang sama dengan assignments
function distributePool(pool, assignments) {
  const totalPool = D(pool).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const totalWork = sumWorkQty(assignments);

  if (assignments.length === 0) return [];
  if (assignments.length === 1) return [totalPool];

  let distributed = D(0);
  const amounts   = [];

  for (let i = 0; i < assignments.length; i++) {
    const isLast = i === assignments.length - 1;
    if (isLast) {
      // Sisa persis ke orang terakhir — menjamin sum = totalPool
      amounts.push(totalPool.minus(distributed));
    } else {
      const ratio = D(assignments[i].workQty).div(totalWork);
      // ROUND_DOWN (truncate) agar sisa selalu ≥ 0 untuk orang terakhir
      const amt   = totalPool.mul(ratio).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
      amounts.push(amt);
      distributed = distributed.plus(amt);
    }
  }

  return amounts;
}

// ── Deteksi colorist dalam satu session ──────────────────────────────
//
// Digunakan untuk menentukan rate komisi ABSENT vs PRESENT (slotKey "colorist").
// items: treatmentItem[] — tiap item punya assignments[].
function detectColoristInSession(items) {
  return items.some((item) =>
    item.assignments.some((a) => a.slotKey === "colorist")
  );
}

// ── Kalkulasi sistem kategori-job (SATU sumber perhitungan) ───────────
//
// Dipakai oleh: Kalkulator Komisi (preview + finalize) dan regenerate.
//
// Input satu treatment item:
//   subtotal  : base item default (InvoiceItem.subtotal / priceSnapshot)
//   worker.itemBase (opsional): base item menurut commissionBase rule staf
//               (sebelum/sesudah diskon & pajak); fallback ke subtotal
//   itemQty   : qty item dalam satuan konversi (qty × conversionSnapshot, mis. 180 helai)
//   jobs      : [{ commissionJobId, jobName, jobKey, sortOrder, deductsFromJobId,
//                  pricePerUnit, unit, splitMode, workers: [{ treatmentJobAssignmentId,
//                  employeeId, employeeName, workQty, commissionRuleId, commissionType,
//                  commissionValue, commissionBase }] }]
//   qtyOverrides : { [treatmentJobAssignmentId]: qty } — koreksi qty dari kalkulator
//
// Aturan:
//   Helper (deductsFromJobId diisi):
//     · Rule PERCENTAGE + harga/unit (HELPER_UNIT): base helper = qty × harga/unit,
//         komisi = base × rate%, base helper memotong BASE job primary target
//     · Rule FIXED (nilai flat, dengan/tanpa harga/unit): komisi = nominal rule
//         (sekali per staf, tidak dikali qty), nominal memotong KOMISI akhir job primary
//   Primary:
//     sisa base staf = base item staf − Σ base helper
//     porsi staf (splitMode):
//       BY_QTY : qty staf ÷ qty item (fallback ÷ total qty staf, lalu rata)
//       EQUAL  : 1 ÷ jumlah staf
//       FULL   : 1 (setiap staf penuh)
//     PERCENTAGE: komisi = sisa base × porsi × rate% − (potongan flat × porsi)
//     FIXED     : komisi = nominal rule − (potongan flat × porsi)
//   Semua komisi dibulatkan ke rupiah (half-up), minimal 0.

const toNum  = (d) => Number(D(d).toFixed(6));
const roundRp = (d) => D(d).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
const maxZero = (d) => (D(d).isNegative() ? D(0) : D(d));

function _primaryRatio(splitMode, { qty, itemQty, totalWorkQty, n }) {
  if (splitMode === "FULL")  return D(1);
  if (splitMode === "EQUAL") return D(1).div(n);
  // BY_QTY
  if (D(itemQty).gt(0))      return D(qty).div(itemQty);
  if (D(totalWorkQty).gt(0)) return D(qty).div(totalWorkQty);
  return D(1).div(n);
}

function calcCategoryItem({ subtotal, itemQty, jobs, qtyOverrides = {} }) {
  const totalBase = D(subtotal ?? 0);
  const qtyOf     = (w) => {
    const o = qtyOverrides[w.treatmentJobAssignmentId];
    return D(o !== undefined && o !== null ? o : (w.workQty ?? 0));
  };
  const hasRule   = (w) => w.commissionType != null;
  const rateOf    = (w) => D(w.commissionValue ?? 0);
  // Base item per staf mengikuti commissionBase rule-nya (fallback subtotal)
  const baseOf    = (w) => (w.itemBase != null ? D(w.itemBase) : totalBase);

  // jobId → { base, flat } potongan dari helper
  const dedMap = {};
  const ded    = (id) => (dedMap[id] ??= { base: D(0), flat: D(0) });

  const baseRow = (w) => ({
    treatmentJobAssignmentId: w.treatmentJobAssignmentId,
    employeeId:               w.employeeId,
    employeeName:             w.employeeName ?? "",
    commissionRuleId:         w.commissionRuleId ?? null,
    commissionType:           w.commissionType ?? null,
    commissionValue:          w.commissionValue != null ? String(w.commissionValue) : null,
    commissionBase:           w.commissionBase ?? null,
    hasRule:                  hasRule(w),
    rateSource:               w.rateSource ?? (w.commissionRuleId ? "RULE" : null),
    itemBase:                 toNum(baseOf(w)),
  });

  // ── Phase 1: helper ──
  const helpers = jobs.filter((j) => j.deductsFromJobId).map((job) => {
    const price = D(job.pricePerUnit ?? 0);
    const role  = price.gt(0) ? "HELPER_UNIT" : "HELPER_FLAT";

    const rows = job.workers.map((w) => {
      const qty = qtyOf(w);
      let effectiveBase = D(0);
      let amount        = D(0);

      if (role === "HELPER_UNIT" && w.commissionType !== "FIXED") {
        // Helper persen: base helper = qty × harga/unit → memotong BASE job utama
        effectiveBase = qty.mul(price);
        if (hasRule(w)) amount = roundRp(effectiveBase.mul(rateOf(w)).div(100));
        ded(job.deductsFromJobId).base = ded(job.deductsFromJobId).base.add(effectiveBase);
      } else {
        // Helper bernilai flat (rule FIXED, dengan/tanpa harga per unit): nominal rule
        // dibayar sekali per staf dan memotong KOMISI job utama (bukan base / invoice)
        amount = hasRule(w) ? roundRp(rateOf(w)) : D(0);
        if (amount.gt(0)) ded(job.deductsFromJobId).flat = ded(job.deductsFromJobId).flat.add(amount);
      }

      return {
        ...baseRow(w),
        workQty:       toNum(qty),
        workRatio:     null,
        effectiveBase: toNum(effectiveBase),
        grossAmount:   toNum(amount),
        flatDeduction: 0,
        amount:        toNum(amount),
      };
    });

    return { ...jobMeta(job), role, rows };
  });

  // ── Phase 2: primary ──
  const primaries = jobs.filter((j) => !j.deductsFromJobId).map((job) => {
    const d             = dedMap[job.commissionJobId] ?? { base: D(0), flat: D(0) };
    const remainingBase = maxZero(totalBase.sub(d.base));
    const n             = job.workers.length || 1;
    const totalWorkQty  = job.workers.reduce((s, w) => s.add(qtyOf(w)), D(0));
    const splitMode     = job.splitMode ?? "BY_QTY";

    const rows = job.workers.map((w) => {
      const qty        = qtyOf(w);
      const ratio      = _primaryRatio(splitMode, { qty, itemQty: itemQty ?? 0, totalWorkQty, n });
      const workerRemaining = maxZero(baseOf(w).sub(d.base));
      const workerBase      = workerRemaining.mul(ratio);
      const workerFlat = d.flat.mul(ratio);

      let gross = D(0);
      if (w.commissionType === "PERCENTAGE") gross = workerBase.mul(rateOf(w)).div(100);
      else if (w.commissionType === "FIXED") gross = rateOf(w);

      const amount = hasRule(w) ? roundRp(maxZero(gross.sub(workerFlat))) : D(0);

      return {
        ...baseRow(w),
        workQty:       toNum(qty),
        workRatio:     toNum(ratio),
        effectiveBase: toNum(workerBase),
        grossAmount:   toNum(gross),
        flatDeduction: toNum(hasRule(w) ? workerFlat : 0),
        remainingBase: toNum(workerRemaining),
        amount:        toNum(amount),
      };
    });

    return {
      ...jobMeta(job),
      role:          "PRIMARY",
      remainingBase: toNum(remainingBase),
      baseDeduction: toNum(d.base),
      flatDeduction: toNum(d.flat),
      rows,
    };
  });

  return [...primaries, ...helpers].sort((a, b) => a.sortOrder - b.sortOrder);
}

function jobMeta(job) {
  return {
    commissionJobId:  job.commissionJobId,
    jobName:          job.jobName,
    jobKey:           job.jobKey,
    sortOrder:        job.sortOrder ?? 0,
    deductsFromJobId: job.deductsFromJobId ?? null,
    pricePerUnit:     job.pricePerUnit != null ? Number(job.pricePerUnit) : null,
    unit:             job.unit || "helai",
    splitMode:        job.splitMode ?? "BY_QTY",
  };
}

// ── Tarif bawaan job (COM-013) ────────────────────────────────────────
//
// Dipakai untuk staf yang TIDAK punya Commission Rule sendiri.
// job: { defaultCommissionType, defaultCommissionValue, rateTiers: [{ maxStaff, value }] }
// staffCount: jumlah staf unik di kategori yang sama pada invoice.
// Tingkatan: maxStaff terkecil yang >= staffCount; jika tak ada → tingkatan maxStaff null
// ("lebih dari itu"); jika tak ada → defaultCommissionValue.
// @returns { commissionType, commissionValue, tierMaxStaff } | null (job tanpa tarif bawaan)

function resolveJobDefaultRate(job, staffCount) {
  if (!job?.defaultCommissionType) return null;
  const tiers   = job.rateTiers ?? [];
  const bounded = tiers.filter((t) => t.maxStaff != null).sort((a, b) => a.maxStaff - b.maxStaff);
  const matched = bounded.find((t) => t.maxStaff >= staffCount)
    ?? tiers.find((t) => t.maxStaff == null)
    ?? null;
  const value = matched ? matched.value : job.defaultCommissionValue;
  if (value == null) return null;
  return {
    commissionType:  job.defaultCommissionType,
    commissionValue: String(value),
    tierMaxStaff:    matched ? matched.maxStaff : undefined,
  };
}

// ── Batas qty Input Job (COM-015) ─────────────────────────────────────
//
// Untuk job UTAMA dengan cara bagi BY_QTY (proporsional qty), total qty semua staf
// pada satu item tidak boleh melebihi qty item di invoice (qty × konversi, mis. 120 helai).
// Sama dengan validasi "Max" di Kalkulator Komisi.
//
// items: [{ treatmentItemId, itemName, itemQty, jobs: [{ id, name, unit, splitMode, deductsFromJobId }] }]
// assignments: [{ treatmentItemId, commissionJobId, workQty }]
// @returns [{ treatmentItemId, itemName, jobName, unit, total, max }] — kosong jika aman

function findJobQtyLimitViolations(items, assignments) {
  const totals = new Map();
  for (const a of assignments) {
    if (!a.commissionJobId) continue;
    const key = `${a.treatmentItemId}::${a.commissionJobId}`;
    totals.set(key, (totals.get(key) ?? 0) + Number(a.workQty ?? 0));
  }

  const violations = [];
  for (const item of items) {
    if (item.itemQty == null || item.itemQty <= 0) continue;
    for (const job of item.jobs) {
      if (job.deductsFromJobId || (job.splitMode ?? "BY_QTY") !== "BY_QTY") continue;
      const total = totals.get(`${item.treatmentItemId}::${job.id}`) ?? 0;
      if (total > item.itemQty) {
        violations.push({ treatmentItemId: item.treatmentItemId, itemName: item.itemName, jobName: job.name, unit: job.unit || "helai", total, max: item.itemQty });
      }
    }
  }
  return violations;
}

// ── Business rules (pure, tanpa DB) ──────────────────────────────────

// Override diizinkan hanya jika komisi masih PENDING atau APPROVED.
// PAID tidak bisa di-override — harus lewat proses pembatalan manual.
function canOverride(status) {
  return status === "PENDING" || status === "APPROVED";
}

// Cek apakah invoice boleh di-regenerate.
// Boleh regenerate hanya jika SEMUA komisi masih PENDING.
// Jika ada yang sudah APPROVED/PAID → tidak boleh, karena akan hilang dari laporan.
function canRegenerate(existingCommissions) {
  const blockers = existingCommissions.filter(
    (c) => c.status !== "PENDING"
  );
  return {
    allowed:  blockers.length === 0,
    blockers: blockers.map((c) => ({ id: c.id, status: c.status })),
  };
}

module.exports = {
  D,
  isSameDayWIB,
  toWIBDateString,
  sumWorkQty,
  calcCommissionAmount,
  distributePool,
  detectColoristInSession,
  calcCategoryItem,
  resolveJobDefaultRate,
  findJobQtyLimitViolations,
  canOverride,
  canRegenerate,
};
