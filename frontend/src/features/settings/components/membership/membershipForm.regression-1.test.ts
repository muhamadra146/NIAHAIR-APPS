// Regression: QA Data menu 2026-10-18 — B8/B9: form paket membership hanya menampilkan
// "Data tidak valid" tanpa pesan per kolom; nama spasi saja lolos.
import { describe, expect, test } from "vitest";
import {
  membershipApiErrors, validateMembershipForm, membershipListParams, canEditMembershipPackage, ASSIGNABLE_MEMBERSHIP_PARAMS,
} from "./membershipForm";

// Keputusan user 2026-10-19 (CRM-014): paket bisa dinonaktifkan; filter Aktif/Nonaktif/Semua,
// pilihan paket untuk pelanggan hanya paket aktif.
describe("status paket membership", () => {
  test("filter → query isActive", () => {
    expect(membershipListParams("active")).toEqual({ limit: 100, isActive: true });
    expect(membershipListParams("inactive")).toEqual({ limit: 100, isActive: false });
    expect(membershipListParams("all")).toEqual({ limit: 100 });
  });

  test("pilihan paket untuk pelanggan hanya paket aktif", () => {
    expect(ASSIGNABLE_MEMBERSHIP_PARAMS.isActive).toBe(true);
  });

  test("tombol ubah paket hanya SA, Owner, Manager", () => {
    for (const r of ["SUPER_ADMIN", "OWNER", "MANAGER"]) expect(canEditMembershipPackage(r)).toBe(true);
    for (const r of ["CASHIER", "OFFICE", "FINANCE", undefined]) expect(canEditMembershipPackage(r)).toBe(false);
  });
});

const OK = { name: "Gold", price: "100000", durationDays: "30", discountType: "PERCENTAGE" as const, discountValue: "10" };

describe("validateMembershipForm", () => {
  test("isian benar → tanpa error", () => expect(validateMembershipForm(OK)).toEqual({}));

  test("nama spasi, durasi pecahan, diskon > 100%", () => {
    expect(validateMembershipForm({ ...OK, name: "  ", durationDays: "1.5", discountValue: "150" })).toEqual({
      name: "Nama paket wajib diisi",
      durationDays: "Durasi harus bilangan bulat (hari)",
      discountValue: "Diskon persen tidak boleh lebih dari 100%",
    });
  });
});

describe("membershipApiErrors", () => {
  test("errors[] dari API dipetakan per kolom", () => {
    const err = { response: { data: { message: "Data tidak valid", errors: [{ field: "name", message: "Nama paket wajib diisi" }] } } };
    expect(membershipApiErrors(err)).toEqual({ message: "Periksa kembali isian yang ditandai", fields: { name: "Nama paket wajib diisi" } });
  });

  test("tanpa errors[] → pesan server", () => {
    const err = { response: { data: { message: "Paket sudah pernah dipakai" } } };
    expect(membershipApiErrors(err)).toEqual({ message: "Paket sudah pernah dipakai", fields: {} });
  });
});
