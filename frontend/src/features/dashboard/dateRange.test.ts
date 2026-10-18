import { describe, expect, it } from "vitest";
import { dateRangeError, payrollCardLink } from "./dateRange";

describe("dateRangeError", () => {
  it("Dari sesudah Sampai → pesan peringatan", () => {
    expect(dateRangeError("2026-10-20", "2026-10-01")).toBe("Tanggal \"Dari\" tidak boleh setelah tanggal \"Sampai\"");
  });
  it("rentang benar atau sama → tidak ada peringatan", () => {
    expect(dateRangeError("2026-10-01", "2026-10-31")).toBeNull();
    expect(dateRangeError("2026-10-18", "2026-10-18")).toBeNull();
  });
});

describe("payrollCardLink", () => {
  const q = "dari=2026-10-01&sampai=2026-10-31&cabang=b1";
  it("Owner / Super Admin / Finance → rincian gaji dengan filter periode & cabang", () => {
    for (const r of ["OWNER", "SUPER_ADMIN", "FINANCE"]) {
      expect(payrollCardLink(r, q)).toBe(`/finance/rincian?jenis=gaji&${q}`);
    }
  });
  it("Manager tidak diarahkan ke /payroll (tidak punya akses) → tanpa tautan", () => {
    expect(payrollCardLink("MANAGER", q)).toBeUndefined();
  });
});
