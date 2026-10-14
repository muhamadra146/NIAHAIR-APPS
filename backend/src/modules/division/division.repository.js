const prisma = require("../../config/prisma");

const SELECT = {
  id: true, code: true, name: true, isActive: true, createdAt: true, updatedAt: true,
  _count: { select: { employees: true } },
};

const findAll = ({ includeInactive = false } = {}) =>
  prisma.division.findMany({
    where:   includeInactive ? {} : { isActive: true },
    select:  SELECT,
    orderBy: { name: "asc" },
  });

const findById   = (id)   => prisma.division.findUnique({ where: { id },   select: SELECT });
const findByCode = (code) => prisma.division.findUnique({ where: { code }, select: { id: true } });

const create = (data)     => prisma.division.create({ data, select: SELECT });
const update = (id, data) => prisma.division.update({ where: { id }, data, select: SELECT });

// ── Data untuk aturan akses divisi ────────────────────────────────────

/** Divisi, cabang utama & status manager satu karyawan */
const findEmployeeScope = (employeeId) =>
  prisma.employee.findUnique({
    where:  { id: employeeId },
    select: { id: true, divisionId: true, homeBranchId: true, isDivisionManager: true, isActive: true },
  });

/** Manager divisi aktif untuk satu divisi + cabang (penerima notifikasi pengajuan) */
const findDivisionManagers = ({ divisionId, branchId, excludeEmployeeId }) =>
  prisma.employee.findMany({
    where: {
      divisionId,
      homeBranchId:      branchId,
      isDivisionManager: true,
      isActive:          true,
      ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
    },
    select: { id: true, name: true, email: true, user: { select: { id: true, email: true } } },
  });

module.exports = { findAll, findById, findByCode, create, update, findEmployeeScope, findDivisionManagers };
