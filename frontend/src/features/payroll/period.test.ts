import { describe, it, expect } from "vitest";
import { payrollMonthLabel, payrollRangeLabel, payrollDayLabel } from "./period";

// COM-017 / PAY-001: nama gaji = bulan kerja (bulan periode dimulai)

describe("label periode gaji", () => {
  it("tanggal gajian 1: periode 1–31 Okt = Gaji Oktober", () => {
    expect(payrollMonthLabel("2026-10-01T00:00:00.000Z")).toBe("Oktober 2026");
    expect(payrollRangeLabel("2026-10-01T00:00:00.000Z", "2026-10-31T00:00:00.000Z")).toBe("1 Okt – 31 Okt 2026");
  });

  it("tanggal gajian 7: periode 7 Okt–6 Nov tetap Gaji Oktober", () => {
    expect(payrollMonthLabel("2026-10-07T00:00:00.000Z")).toBe("Oktober 2026");
    expect(payrollRangeLabel("2026-10-07T00:00:00.000Z", "2026-11-06T00:00:00.000Z")).toBe("7 Okt – 6 Nov 2026");
  });

  it("tanggal bayar", () => {
    expect(payrollDayLabel("2026-11-01T00:00:00.000Z")).toBe("1 Nov 2026");
  });
});
