import { describe, it, expect } from "vitest";
import { parsePayDay, payrollListMonth } from "./period";

// Regression QA 2026-10-18: Bulk Generate menerima tanggal gajian 45 dan hanya menampilkan "Data tidak valid"
describe("parsePayDay (Filter Tanggal Gajian)", () => {
  it("kosong = semua karyawan", () => {
    expect(parsePayDay("")).toEqual({});
    expect(parsePayDay("  ")).toEqual({});
  });
  it("1–31 bilangan bulat diterima", () => {
    expect(parsePayDay("1")).toEqual({ value: 1 });
    expect(parsePayDay("31")).toEqual({ value: 31 });
  });
  it.each(["0", "32", "45", "4.5", "-1", "abc"])("%s ditolak dengan pesan Indonesia", (v) => {
    expect(parsePayDay(v)).toEqual({ error: "Tanggal gajian harus bilangan bulat 1–31" });
  });
});

describe("payrollListMonth (daftar pindah ke bulan yang di-generate)", () => {
  it("bulan dari tanggal mulai periode", () => {
    expect(payrollListMonth("2026-11-01T00:00:00.000Z")).toBe("2026-11");
    expect(payrollListMonth("2026-10-07T00:00:00.000Z")).toBe("2026-10");
  });
});
