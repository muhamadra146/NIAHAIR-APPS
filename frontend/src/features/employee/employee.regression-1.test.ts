// Regression: QA Data menu 2026-10-18 — B13 (tanggal gajian kosong → "Too small"), B11 (validasi),
// B4 (kolom tidak bisa dikosongkan), B12 (PATCH /branches selalu dipanggil walau bukan Super Admin).
import { describe, expect, test } from "vitest";
import { createEmployeeSchema, updateEmployeeSchema } from "./schemas/employee.schema";
import { branchesChanged, canEditBranchAccess, fileTooLarge, toUpdateEmployeeInput, uploadMsg } from "./employeeInput";
import type { Employee } from "./types";

const BASE = { name: "QA-DFIX", roleId: "r1" };

describe("schema", () => {
  test("B13: tanggal gajian kosong diterima (null)", () => {
    for (const payDay of ["", null, undefined, Number.NaN]) {
      const r = createEmployeeSchema.safeParse({ ...BASE, payDay });
      expect(r.success).toBe(true);
      expect(r.data?.payDay ?? null).toBeNull();
    }
  });

  test("tanggal gajian 0 / 32 → pesan Indonesia", () => {
    const r = createEmployeeSchema.safeParse({ ...BASE, payDay: 32 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Tanggal gajian harus antara 1 dan 31");
  });

  test("B11: nama spasi, NIK, HP, tanggal lahir", () => {
    expect(createEmployeeSchema.safeParse({ ...BASE, name: "   " }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...BASE, nikKtp: "123" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...BASE, nikKtp: "3174012345678901" }).success).toBe(true);
    expect(createEmployeeSchema.safeParse({ ...BASE, phone: "abc" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...BASE, phone: "0812-3456-7890" }).data?.phone).toBe("081234567890");
    expect(createEmployeeSchema.safeParse({ ...BASE, birthDate: "2026-02-31" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...BASE, birthDate: "2999-01-01" }).success).toBe(false);
  });
});

const EMP = {
  id: "e1", employeeCode: "EMP001", name: "A", phone: "081234567890", email: "a@x.com", hireDate: null,
  birthDate: "1990-01-01T00:00:00.000Z", address: "Jl", emergencyContact: "Ibu", nikKtp: null, resignDate: null,
  roleId: "r1", commissionEnabled: true, isActive: true, payDay: null, homeBranchId: "b1", homeBranch: null,
  employeeBranches: [{ id: "x", branchId: "b1", isPrimary: true, isActive: true, branch: { id: "b1", code: "B1", name: "B1" } }],
} as unknown as Employee;

describe("B4 — body ubah karyawan", () => {
  test("kolom dikosongkan dikirim null, kode karyawan tidak dikirim", () => {
    const v = updateEmployeeSchema.parse({ name: "A", roleId: "r1", employeeCode: "EMP001", phone: "", email: "", address: "", emergencyContact: "", birthDate: "", payDay: "" });
    const input = toUpdateEmployeeInput(v, EMP, false);
    expect(input).toMatchObject({ phone: null, email: null, address: null, emergencyContact: null, birthDate: null, payDay: null });
    expect(input).not.toHaveProperty("employeeCode");
    expect(input).not.toHaveProperty("divisionId");
  });
});

describe("B12 — akses cabang", () => {
  test("hanya Super Admin yang boleh mengubah akses cabang", () => {
    expect(canEditBranchAccess("SUPER_ADMIN")).toBe(true);
    for (const r of ["OWNER", "MANAGER", "OFFICE"]) expect(canEditBranchAccess(r)).toBe(false);
  });

  test("branchesChanged hanya true bila daftar berbeda", () => {
    expect(branchesChanged(["b1"], EMP)).toBe(false);
    expect(branchesChanged(["b1", "b2"], EMP)).toBe(true);
    expect(branchesChanged([], EMP)).toBe(true);
  });
});

describe("file 10 MB", () => {
  test("fileTooLarge & pesan backend dilengkapi batas", () => {
    expect(fileTooLarge({ size: 10 * 1024 * 1024 + 1 } as File)).toBe(true);
    expect(fileTooLarge({ size: 1024 } as File)).toBe(false);
    expect(uploadMsg("Ukuran file terlalu besar")).toBe("Ukuran file terlalu besar (maksimal 10 MB)");
  });
});
