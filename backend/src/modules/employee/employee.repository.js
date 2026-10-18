const prisma = require("../../config/prisma");

const INCLUDE = {
  role:       { select: { id: true, code: true, name: true } },
  homeBranch: { select: { id: true, code: true, name: true } },
  division:   { select: { id: true, code: true, name: true } },
  // Akun login — email-nya selalu sama dengan email karyawan
  user:       { select: { id: true, email: true } },
  employeeBranches: {
    where:   { isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { branch: { select: { id: true, code: true, name: true } } },
  },
};

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.employee.findMany({ skip, take, where, orderBy: orderBy ?? { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.employee.count({ where });

const findById = (id) =>
  prisma.employee.findUnique({ where: { id }, include: INCLUDE });

// Kode karyawan dibandingkan tanpa beda huruf besar/kecil (EMP-001, B11)
const findByEmployeeCode = (employeeCode) =>
  prisma.employee.findFirst({ where: { employeeCode: { equals: employeeCode, mode: "insensitive" } } });

const findLastEmployeeCode = () =>
  prisma.employee.findFirst({
    where:   { employeeCode: { startsWith: "EMP" } },
    orderBy: { employeeCode: "desc" },
    select:  { employeeCode: true },
  });

// Email dicari tanpa beda huruf besar/kecil (data lama bisa tersimpan campuran)
const findByEmail = (email) =>
  prisma.employee.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

/** Akun user yang memakai email ini */
const findUserByEmail = (email) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, employeeId: true } });

const findRoleById = (id) =>
  prisma.employeeRole.findUnique({ where: { id }, select: { id: true } });

// Prisma menolak kolom FK (divisionId) yang dicampur dengan relasi (role/homeBranch connect) —
// divisi selalu ditulis sebagai relasi
const divisionWrite = (divisionId, isUpdate) => {
  if (divisionId)                         return { division: { connect: { id: divisionId } } };
  if (divisionId === null && isUpdate)    return { division: { disconnect: true } };
  return {};
};

const create = (data) => {
  const { roleId, homeBranchId, divisionId, ...rest } = data;
  return prisma.employee.create({
    data: {
      ...rest,
      role: { connect: { id: roleId } },
      ...(homeBranchId && { homeBranch: { connect: { id: homeBranchId } } }),
      ...divisionWrite(divisionId, false),
    },
    include: INCLUDE,
  });
};

/** syncUserId: bila email berubah, email login akun karyawan ikut diperbarui */
const update = (id, data, syncUserId = null) => {
  const { roleId, homeBranchId, divisionId, ...rest } = data;

  let homeBranchWrite;
  if (homeBranchId)          homeBranchWrite = { connect: { id: homeBranchId } };
  else if (homeBranchId === null) homeBranchWrite = { disconnect: true };

  const write = (tx) => tx.employee.update({
    where: { id },
    data: {
      ...rest,
      ...(roleId        && { role:       { connect: { id: roleId } } }),
      ...(homeBranchWrite && { homeBranch: homeBranchWrite }),
      ...divisionWrite(divisionId, true),
    },
    include: INCLUDE,
  });
  if (!syncUserId || data.email === undefined) return write(prisma);
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: syncUserId }, data: { email: data.email } });
    return write(tx);
  });
};

// Cabang "Utama" (isPrimary) selalu = Home Branch karyawan (EMP-005, B15)
const updateBranches = (employeeId, branchIds) =>
  prisma.$transaction(async (tx) => {
    const emp = await tx.employee.findUnique({ where: { id: employeeId }, select: { homeBranchId: true } });
    await tx.employeeBranch.deleteMany({ where: { employeeId } });
    const ids = [...new Set(branchIds)];
    if (ids.length > 0) {
      await tx.employeeBranch.createMany({
        data: ids.map((branchId) => ({
          employeeId,
          branchId,
          isPrimary: branchId === emp?.homeBranchId,
          isActive:  true,
        })),
      });
    }
    return tx.employee.findUnique({ where: { id: employeeId }, include: INCLUDE });
  });

/**
 * Samakan cabang Utama dengan Home Branch: hanya cabang Home Branch yang isPrimary,
 * dan Home Branch selalu termasuk cabang tempat karyawan bisa bekerja (EMP-005, B15).
 */
const syncPrimaryBranch = (employeeId, homeBranchId) =>
  prisma.$transaction(async (tx) => {
    await tx.employeeBranch.updateMany({
      where: { employeeId, isPrimary: true, ...(homeBranchId && { branchId: { not: homeBranchId } }) },
      data:  { isPrimary: false },
    });
    if (homeBranchId) {
      await tx.employeeBranch.upsert({
        where:  { employeeId_branchId: { employeeId, branchId: homeBranchId } },
        update: { isPrimary: true, isActive: true },
        create: { employeeId, branchId: homeBranchId, isPrimary: true, isActive: true },
      });
    }
    return tx.employee.findUnique({ where: { id: employeeId }, include: INCLUDE });
  });

const updateFiles = (id, data) =>
  prisma.employee.update({ where: { id }, data, include: INCLUDE });

const softDelete = (id) =>
  prisma.employee.update({ where: { id }, data: { isActive: false } });

// Relasi yang dihitung sebagai riwayat karyawan (EMP-015: riwayat tidak boleh hilang).
// Tidak termasuk: akses cabang (employeeBranches) & akun login (user) — ikut terhapus.
const HISTORY_RELATIONS = [
  "branchHistories", "createdAppointments", "createdDeposits", "createdInvoices", "createdPayments",
  "filledConsultations", "appointmentStaffs", "treatmentAssignments", "commissionRules", "commissions",
  "attendances", "schedules", "leaves", "overtimeChargeEmployees", "staffSchedules", "salarySettings",
  "omsetBonusTiers", "loans", "payrolls", "leaveQuotas", "correctionRequests", "permissionRequests",
  "sickLeaves", "inventoryMovements", "inventoryPeriods", "purchaseInvoices", "complaintsAbout",
  "treatmentJobAssignments", "productionOrders", "productionEmployees", "productionQCs",
  "productionTimelines", "purchaseReturns", "stockOpnamesCreated", "stockOpnamesPosted",
];
const USER_HISTORY_RELATIONS = ["reviewedCorrections", "reviewedPermissions", "reviewedSickLeaves"];

/** Jumlah seluruh catatan riwayat milik karyawan (termasuk persetujuan yang dibuat akunnya) */
const countHistory = async (id) => {
  const row = await prisma.employee.findUnique({
    where:  { id },
    select: {
      _count: { select: Object.fromEntries(HISTORY_RELATIONS.map((r) => [r, true])) },
      user:   { select: { _count: { select: Object.fromEntries(USER_HISTORY_RELATIONS.map((r) => [r, true])) } } },
    },
  });
  if (!row) return 0;
  const sum = (counts) => Object.values(counts ?? {}).reduce((a, b) => a + Number(b || 0), 0);
  return sum(row._count) + sum(row.user?._count);
};

/** Hapus permanen — hanya dipanggil untuk karyawan TANPA riwayat (lihat countHistory) */
const hardDelete = (id) =>
  prisma.$transaction(async (tx) => {
    await tx.employeeBranch.deleteMany({ where: { employeeId: id } });
    await tx.user.deleteMany({ where: { employeeId: id } });
    await tx.employee.delete({ where: { id } });
  });

module.exports = {
  findAll, count, findById,
  findByEmployeeCode, findLastEmployeeCode, findByEmail, findUserByEmail,
  findRoleById,
  create, update, updateFiles, updateBranches, syncPrimaryBranch, softDelete, hardDelete, countHistory,
};
