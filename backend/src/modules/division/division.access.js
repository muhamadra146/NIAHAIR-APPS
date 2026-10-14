// ── Aturan akses per divisi ────────────────────────────────────────────
//
// Keputusan user 2026-10-14:
//   · Owner & Super Admin   → semua karyawan.
//   · Manager divisi        → staf yang SATU DIVISI dan SATU CABANG UTAMA dengannya,
//                             bukan dirinya sendiri dan bukan sesama manager divisi.
//                             (pengajuan milik manager disetujui Owner / Super Admin)
//   · Karyawan tanpa divisi → hanya diurus Owner & Super Admin.
//   · Jadwal: setiap karyawan melihat jadwal rekan satu divisi di cabangnya;
//             karyawan tanpa divisi hanya melihat jadwalnya sendiri.

const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { ROLES } = require("../../common/constants/role.constant");
const repo = require("./division.repository");

const FULL_ACCESS_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER];

const hasFullAccess = (user) => FULL_ACCESS_ROLES.includes(user?.roleCode);

/**
 * Lingkup wewenang user yang sedang login.
 * @returns {{ all: boolean, manager: boolean, employeeId: string|null, divisionId?: string, branchId?: string }}
 */
const getScope = async (user) => {
  if (hasFullAccess(user)) return { all: true, manager: false, employeeId: user.employeeId ?? null };
  const emp = user?.employeeId ? await repo.findEmployeeScope(user.employeeId) : null;
  if (!emp || !emp.isActive) return { all: false, manager: false, employeeId: user?.employeeId ?? null };
  return {
    all:        false,
    manager:    Boolean(emp.isDivisionManager && emp.divisionId && emp.homeBranchId),
    employeeId: emp.id,
    divisionId: emp.divisionId ?? null,
    branchId:   emp.homeBranchId ?? null,
  };
};

const isApprover = (scope) => scope.all || scope.manager;

/** Filter Prisma `employee` untuk karyawan yang boleh diurus (jadwal & persetujuan) */
const managedEmployeeWhere = (scope) => {
  if (scope.all) return {};
  if (!scope.manager) return { id: "__tidak_ada__" };
  return {
    divisionId:        scope.divisionId,
    homeBranchId:      scope.branchId,
    isDivisionManager: false,
    id:                { not: scope.employeeId },
  };
};

/** Filter Prisma `employee` untuk jadwal yang boleh DILIHAT */
const visibleEmployeeWhere = async (user) => {
  if (hasFullAccess(user)) return {};
  const emp = user?.employeeId ? await repo.findEmployeeScope(user.employeeId) : null;
  if (!emp) return { id: "__tidak_ada__" };
  if (!emp.divisionId) return { id: emp.id };
  return { divisionId: emp.divisionId, homeBranchId: emp.homeBranchId };
};

const canManageTarget = (scope, target) => {
  if (scope.all) return true;
  if (!scope.manager || !target) return false;
  return target.divisionId === scope.divisionId
    && target.homeBranchId === scope.branchId
    && !target.isDivisionManager
    && target.id !== scope.employeeId;
};

/**
 * Pastikan user boleh mengurus karyawan target (menyetujui pengajuan / mengubah jadwal).
 * `user` kosong = panggilan internal sistem (bukan dari request), tidak dibatasi.
 */
const assertCanManage = async (user, targetEmployeeId, scope = null) => {
  if (!user) return;
  const s = scope ?? await getScope(user);
  if (s.all) return;
  const target = await repo.findEmployeeScope(targetEmployeeId);
  if (!canManageTarget(s, target)) {
    throw new AppError(
      "Hanya manager divisi karyawan ini (di cabangnya) atau Owner / Super Admin yang dapat melakukan ini.",
      StatusCodes.FORBIDDEN,
    );
  }
};

module.exports = {
  FULL_ACCESS_ROLES, hasFullAccess, getScope, isApprover,
  managedEmployeeWhere, visibleEmployeeWhere, canManageTarget, assertCanManage,
};
