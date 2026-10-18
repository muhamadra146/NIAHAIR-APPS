// Regression: QA Data menu 2026-10-18 — B4 (kolom opsional tidak bisa dikosongkan: form mengirim
// `|| undefined`), B6 (tombol per peran), aturan HP sama dengan backend, label Indonesia.
import { describe, expect, test } from "vitest";
import { customerSchema } from "./schemas/customer.schema";
import { toCreateCustomerInput, toUpdateCustomerInput } from "./customerInput";
import { customerPermissions } from "./permissions";
import { customerSyncView, SYNC_LABEL, GENDER_LABEL } from "./syncStatus";
import type { Customer } from "./types";

const CUSTOMER: Customer = {
  id: "c1", customerNo: "C.00001", name: "Ani", mobilePhone: "6281234567890", email: "ani@x.com",
  address: "Jl Lama", city: "Jakarta", province: null, birthDate: "1990-05-01T00:00:00.000Z", gender: "FEMALE",
  membershipId: null, notes: "VIP", isActive: true, accurateCustomerId: 40, syncStatus: "SYNCED", syncError: null,
  lastVisitAt: null, lastSyncAt: null, createdAt: "", updatedAt: "", membership: null,
};

const form = (over: Partial<Record<string, string>> = {}) => customerSchema.parse({
  name: "Ani", mobilePhone: "6281234567890", email: "ani@x.com", gender: "FEMALE", birthDate: "1990-05-01",
  address: "Jl Lama", city: "Jakarta", province: "", notes: "VIP", ...over,
});

describe("schema", () => {
  test("HP: pemisah & + dibuang, aturan sama dengan backend", () => {
    expect(form({ mobilePhone: "+62 812-3456-7890" }).mobilePhone).toBe("6281234567890");
    expect(customerSchema.safeParse({ name: "A", mobilePhone: "0812" }).success).toBe(false);
  });

  test("tanggal lahir mustahil / masa depan ditolak", () => {
    expect(customerSchema.safeParse({ name: "A", mobilePhone: "081234567890", birthDate: "2026-02-31" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "A", mobilePhone: "081234567890", birthDate: "2999-01-01" }).success).toBe(false);
  });

  test("alamat > 255 karakter ditolak", () => {
    expect(customerSchema.safeParse({ name: "A", mobilePhone: "081234567890", address: "x".repeat(256) }).success).toBe(false);
  });
});

describe("B4 — body ubah pelanggan", () => {
  test("kolom yang dikosongkan dikirim null", () => {
    const input = toUpdateCustomerInput(form({ email: "", address: "", notes: "", gender: "", birthDate: "" }), CUSTOMER);
    expect(input).toEqual({ email: null, address: null, notes: null, gender: null, birthDate: null });
  });

  test("tanpa perubahan → body kosong", () => {
    expect(toUpdateCustomerInput(form(), CUSTOMER)).toEqual({});
  });

  test("hanya kolom yang berubah dikirim", () => {
    expect(toUpdateCustomerInput(form({ name: "Ani B", city: "Bogor" }), CUSTOMER)).toEqual({ name: "Ani B", city: "Bogor" });
  });

  test("tambah: kolom kosong tidak dikirim", () => {
    expect(toCreateCustomerInput(form({ email: "", notes: "" }))).toEqual({
      name: "Ani", mobilePhone: "6281234567890", birthDate: "1990-05-01", address: "Jl Lama", city: "Jakarta", gender: "FEMALE",
    });
  });
});

describe("B6 — tombol per peran", () => {
  test("Finance hanya lihat", () => {
    expect(Object.values(customerPermissions("FINANCE")).some(Boolean)).toBe(false);
  });

  test("Kasir: edit, catatan, booking/invoice/deposit — tanpa membership", () => {
    expect(customerPermissions("CASHIER")).toMatchObject({
      canEdit: true, canAddNote: true, canCreateBooking: true, canCreateInvoice: true, canCreateDeposit: true,
      canManageMembership: false, canRetrySync: false,
    });
  });

  test("Office: edit & catatan saja", () => {
    expect(customerPermissions("OFFICE")).toMatchObject({
      canEdit: true, canAddNote: true, canCreateBooking: false, canCreateInvoice: false, canManageMembership: false,
    });
  });

  test("Manager: semua termasuk membership & coba sinkron ulang", () => {
    expect(Object.values(customerPermissions("MANAGER")).every(Boolean)).toBe(true);
  });
});

describe("label status", () => {
  test("gagal sinkron tetap tampil walau sudah punya ID Accurate", () => {
    expect(customerSyncView({ accurateCustomerId: 40, syncStatus: "FAILED" })).toBe("FAILED");
    expect(customerSyncView({ accurateCustomerId: 40, syncStatus: "PENDING" })).toBe("PENDING");
    expect(customerSyncView({ accurateCustomerId: 40, syncStatus: "SYNCED" })).toBe("SYNCED");
  });

  test("label Indonesia", () => {
    expect(SYNC_LABEL).toEqual({ SYNCED: "Tersinkron", PENDING: "Menunggu sinkron", FAILED: "Gagal sinkron" });
    expect(GENDER_LABEL.FEMALE).toBe("Perempuan");
  });
});
