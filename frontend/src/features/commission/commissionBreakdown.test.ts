import { describe, it, expect } from "vitest";
import { breakdownFromCommission, buildBreakdownLines, exactRatio, recoverRemainingBase } from "./commissionBreakdown";
import type { Commission, CommissionSplitMode } from "./types";

// Regression — UI QA 2026-10-18: rincian menampilkan "Rp 7.700.004 × 70/120" (base asli 7.700.000)
// karena workRatio tersimpan dibulatkan 6 desimal.

const round2 = (n: number) => Math.round(n * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function stored(splitMode: CommissionSplitMode, realBase: number, ratio: number, workQty: number, value = 10): Commission {
  const base = round2(realBase * ratio);
  return {
    workRatio:        String(round6(ratio)),
    workQty:          String(workQty),
    baseAmount:       String(base),
    commissionValue:  String(value),
    commissionAmount: String(Math.round((base * value) / 100)),
    commissionType:   "PERCENTAGE",
    isManualOverride: false,
    treatmentJobAssignment: {
      commissionJob: { id: "j1", name: "Cutting", unit: "helai", splitMode, deductsFromJobId: null, pricePerUnit: null },
    },
  } as unknown as Commission;
}

describe("breakdownFromCommission — base asli", () => {
  it("BY_QTY 70/120 dari 7.700.000 → base 7.700.000 (bukan 7.700.004)", () => {
    const b = breakdownFromCommission(stored("BY_QTY", 7_700_000, 70 / 120, 70))!;
    expect(b.remainingBase).toBe(7_700_000);
    expect(b.itemQty).toBe(120);
    expect(buildBreakdownLines(b)[0]).toMatch(/^Rp\s7\.700\.000 × 70\/120 helai × 10%/);
  });

  it("EQUAL 3 staf dari 6.500.000 → base 6.500.000 (bukan 6.500.004)", () => {
    const b = breakdownFromCommission(stored("EQUAL", 6_500_000, 1 / 3, 1))!;
    expect(b.remainingBase).toBe(6_500_000);
    expect(b.staffCount).toBe(3);
  });

  it("BY_QTY 7/9 dari 6.500.000 → 6.500.000 (bukan 6.499.995)", () => {
    const b = breakdownFromCommission(stored("BY_QTY", 6_500_000, 7 / 9, 7))!;
    expect(b.remainingBase).toBe(6_500_000);
  });

  it("FULL → porsi 1, base = base tersimpan", () => {
    const b = breakdownFromCommission(stored("FULL", 1_234_567, 1, 3))!;
    expect(b.remainingBase).toBe(1_234_567);
  });

  it("base bukan rupiah bulat (mis. harga eks-PPN) tetap 2 desimal", () => {
    expect(recoverRemainingBase(round2(6_936_936.94 * 0.5), 0.5)).toBe(6_936_936.94);
  });
});

describe("exactRatio", () => {
  it("memulihkan pecahan dari nilai 6 desimal", () => {
    expect(exactRatio("BY_QTY", 0.583333, 70)).toBeCloseTo(70 / 120, 12);
    expect(exactRatio("EQUAL", 0.333333, 1)).toBeCloseTo(1 / 3, 12);
    expect(exactRatio("FULL", 0.5, 1)).toBe(1);
  });
});
