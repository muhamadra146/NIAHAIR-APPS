// ── Wewenang per divisi (sama dengan backend division.access) ───────────
//   · Owner & Super Admin → semua karyawan
//   · Manager divisi      → staf satu divisi & satu cabang utama (bukan dirinya / sesama manager)
//   · Jadwal              → semua karyawan melihat rekan satu divisinya
import type { AuthUser } from "@/types/auth";

const FULL_ACCESS_ROLES = ["SUPER_ADMIN", "OWNER"];

export const isFullAccess = (user: AuthUser | null | undefined) =>
  !!user && FULL_ACCESS_ROLES.includes(user.roleCode);

export const isDivisionManager = (user: AuthUser | null | undefined) =>
  !!user?.employee?.isDivisionManager && !!user.employee.divisionId;

/** Boleh menyetujui pengajuan & mengubah jadwal (batas staf dicek backend) */
export const canApprove = (user: AuthUser | null | undefined) =>
  isFullAccess(user) || isDivisionManager(user);
