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
  canOverride,
  canRegenerate,
};
