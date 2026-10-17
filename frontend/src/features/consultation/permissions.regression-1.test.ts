// Regression: QA operasional 2026-10-17 — C1 (hak akses Catatan Klien terbalik) & "Lainnya" tanpa keterangan.
// Keputusan owner 2026-10-17: ubah/hapus = penulis atau SA/Owner/Manager; Finance & Office hanya lihat.
import { describe, it, expect } from "vitest";
import { canCreateNote, canModifyNote, missingOtherText } from "./permissions";

const note = { filledByEmployeeId: "eAuthor" };
const u = (roleCode: string, employeeId: string | null = "eOther") => ({ roleCode, employeeId });

describe("canModifyNote", () => {
  it("SA/Owner/Manager boleh untuk catatan siapa pun", () => {
    for (const r of ["SUPER_ADMIN", "OWNER", "MANAGER"]) expect(canModifyNote(u(r), note)).toBe(true);
  });

  it("Kasir/Staf hanya untuk catatan miliknya", () => {
    expect(canModifyNote(u("CASHIER"), note)).toBe(false);
    expect(canModifyNote(u("STAFF_OPERASIONAL"), note)).toBe(false);
    expect(canModifyNote(u("CASHIER", "eAuthor"), note)).toBe(true);
    expect(canModifyNote(u("STAFF_OPERASIONAL", "eAuthor"), note)).toBe(true);
  });

  it("Finance & Office tidak boleh walau penulis", () => {
    expect(canModifyNote(u("FINANCE", "eAuthor"), note)).toBe(false);
    expect(canModifyNote(u("OFFICE", "eAuthor"), note)).toBe(false);
  });

  it("tanpa employeeId tidak dianggap penulis", () => {
    expect(canModifyNote(u("CASHIER", null), { filledByEmployeeId: null })).toBe(false);
  });
});

describe("canCreateNote", () => {
  it("Finance/Office/Inventory hanya lihat", () => {
    for (const r of ["FINANCE", "OFFICE", "INVENTORY"]) expect(canCreateNote(u(r))).toBe(false);
    for (const r of ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "STAFF_OPERASIONAL"]) expect(canCreateNote(u(r))).toBe(true);
  });
});

describe("missingOtherText", () => {
  it("Lainnya tanpa keterangan → pesan", () => {
    expect(missingOtherText({ profession: "OTHER", professionOther: " " })).toBe('Pilihan "Lainnya" pada Profesi wajib diisi keterangannya');
    expect(missingOtherText({ hesitation: ["TAKUT_SAKIT", "OTHER"] })).toContain("Yang bikin ragu");
  });

  it("Lainnya dengan keterangan / bukan Lainnya → null", () => {
    expect(missingOtherText({ profession: "OTHER", professionOther: "Dokter" })).toBeNull();
    expect(missingOtherText({ profession: "IRT", dailyStyling: ["CURLY"] })).toBeNull();
  });
});
