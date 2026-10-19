import type { CreateEmployeeFormValues, UpdateEmployeeFormValues } from "./schemas/employee.schema";
import type { CreateEmployeeInput, Employee, UpdateEmployeeInput } from "./types";

const OPTIONAL_FIELDS = [
  "phone", "email", "hireDate", "birthDate", "address", "emergencyContact", "nikKtp", "resignDate",
] as const;

const DATE_FIELDS = new Set(["hireDate", "birthDate", "resignDate"]);

/** Super Admin dan Owner boleh mengubah akses cabang (PATCH /employees/:id/branches; EMP-005, keputusan user 2026-10-19) */
const BRANCH_ACCESS_ROLES = ["SUPER_ADMIN", "OWNER"];
export const canEditBranchAccess = (roleCode: string | null | undefined) => BRANCH_ACCESS_ROLES.includes(roleCode ?? "");

/** Form → body POST /employees (kolom kosong tidak dikirim, tanggal gajian kosong = null) */
export function toCreateEmployeeInput(v: CreateEmployeeFormValues, canSetDivision: boolean): CreateEmployeeInput {
  const input: CreateEmployeeInput = {
    name:              v.name.trim(),
    roleId:            v.roleId,
    commissionEnabled: v.commissionEnabled,
    payDay:            v.payDay ?? null,
  };
  for (const f of OPTIONAL_FIELDS) {
    const val = (v[f] ?? "").trim();
    if (val) input[f] = val;
  }
  if (v.homeBranchId) input.homeBranchId = v.homeBranchId;
  if (canSetDivision) {
    input.divisionId        = v.divisionId || null;
    input.isDivisionManager = !!v.divisionId && !!v.isDivisionManager;
  }
  return input;
}

/**
 * Form → body PUT /employees/:id.
 * Kolom opsional yang dikosongkan dikirim null agar benar-benar terhapus (B4).
 * Kode karyawan tidak dikirim (tidak dapat diubah, EMP-001).
 */
export function toUpdateEmployeeInput(
  v: UpdateEmployeeFormValues, current: Employee, canSetDivision: boolean,
): UpdateEmployeeInput {
  const input: UpdateEmployeeInput = {
    name:              (v.name ?? current.name).trim(),
    roleId:            v.roleId || current.roleId,
    commissionEnabled: v.commissionEnabled,
    payDay:            v.payDay ?? null,
    isActive:          v.isActive,
    homeBranchId:      v.homeBranchId || null,
  };
  for (const f of OPTIONAL_FIELDS) {
    const val = (v[f] ?? "").trim();
    const cur = DATE_FIELDS.has(f) ? (current[f] ? String(current[f]).split("T")[0] : "") : (current[f] ?? "");
    if (val !== cur) input[f] = val || null;
  }
  if (canSetDivision) {
    input.divisionId        = v.divisionId || null;
    input.isDivisionManager = !!v.divisionId && !!v.isDivisionManager;
  }
  return input;
}

/** true bila daftar cabang akses berbeda dari yang tersimpan */
export function branchesChanged(selected: string[] | undefined, current: Employee): boolean {
  const a = [...new Set(selected ?? [])].sort();
  const b = [...new Set((current.employeeBranches ?? []).map((eb) => eb.branch.id))].sort();
  return a.length !== b.length || a.some((id, i) => id !== b[i]);
}

/** Pesan upload file: sebutkan batas 10 MB */
export const MAX_FILE_MB = 10;
export function fileTooLarge(file: File | null | undefined): boolean {
  return !!file && file.size > MAX_FILE_MB * 1024 * 1024;
}

/** Pesan backend "Ukuran file terlalu besar" dilengkapi batasnya */
export function uploadMsg(msg: string): string {
  return /ukuran file terlalu besar/i.test(msg) && !/MB/.test(msg) ? `${msg} (maksimal ${MAX_FILE_MB} MB)` : msg;
}
