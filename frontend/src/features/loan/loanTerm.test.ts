import { describe, it, expect } from "vitest";
import {
  isRealDateStr, computeLoanTerm, validateLoanInput, validateRepaymentDate, longTermWarning, MAX_LOAN_AMOUNT,
} from "./loanTerm";

describe("isRealDateStr", () => {
  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(isRealDateStr("2026-02-31")).toBe(false);
    expect(isRealDateStr("2026-04-31")).toBe(false);
    expect(isRealDateStr("2026-13-01")).toBe(false);
    expect(isRealDateStr("2026-2-1")).toBe(false);
  });
  it("menerima tanggal nyata termasuk kabisat", () => {
    expect(isRealDateStr("2028-02-29")).toBe(true);
    expect(isRealDateStr("2026-12-31")).toBe(true);
  });
});

describe("computeLoanTerm", () => {
  it("jangka = ceil(total/cicilan), selesai di bulan cicilan terakhir", () => {
    expect(computeLoanTerm(1_000_000, 300_000, "2026-10-01")).toEqual({ months: 4, endDate: "2027-01-01" });
  });
  it("cicilan sangat kecil → tanggal selesai jauh (terlihat sebelum simpan)", () => {
    const t = computeLoanTerm(5_000_000, 1_000, "2026-10-01");
    expect(t?.months).toBe(5000);
    expect(t?.endDate.slice(0, 4)).toBe("2443");
    expect(longTermWarning(t)).toMatch(/5000 bulan/);
  });
  it("tidak ada peringatan untuk jangka ≤ 60 bulan", () => {
    expect(longTermWarning(computeLoanTerm(6_000_000, 100_000, "2026-10-01"))).toBeNull();
    expect(longTermWarning(computeLoanTerm(6_100_000, 100_000, "2026-10-01"))).not.toBeNull();
  });
});

describe("validateLoanInput", () => {
  it("aturan dasar", () => {
    expect(validateLoanInput(0, 1, "2026-10-01")).toMatch(/Total/);
    expect(validateLoanInput(MAX_LOAN_AMOUNT + 1, 1, "2026-10-01")).toMatch(/batas maksimal/);
    expect(validateLoanInput(100, 0, "2026-10-01")).toMatch(/Cicilan/);
    expect(validateLoanInput(100, 200, "2026-10-01")).toMatch(/melebihi total/);
    expect(validateLoanInput(100, 50, "2026-02-31")).toMatch(/Tanggal mulai tidak valid/);
    expect(validateLoanInput(100, 50, "2026-10-01", "2026-09-01")).toMatch(/sebelum tanggal mulai/);
    expect(validateLoanInput(100, 50, "2026-10-01", "2026-11-01")).toBeNull();
  });
});

describe("validateRepaymentDate", () => {
  const start = "2026-01-10T00:00:00.000Z";
  it("tidak di masa depan dan tidak sebelum tanggal mulai", () => {
    expect(validateRepaymentDate("2026-10-19", start, "2026-10-18")).toMatch(/masa depan/);
    expect(validateRepaymentDate("2026-01-09", start, "2026-10-18")).toMatch(/sebelum tanggal mulai/);
    expect(validateRepaymentDate("2026-02-31", start, "2026-10-18")).toMatch(/tidak valid/);
    expect(validateRepaymentDate("2026-10-18", start, "2026-10-18")).toBeNull();
    expect(validateRepaymentDate("2026-01-10", start, "2026-10-18")).toBeNull();
  });
});
