const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update, hardDelete, countActiveEmployees, countAssignedWarehouses } = require("./branch.repository");
const prisma = require("../../config/prisma");

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [branches, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data: branches,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);
  return branch;
};

const createBranch = async (body) => {
  const existing = await findByCode(body.code);
  if (existing) throw new AppError("Branch code already exists", StatusCodes.CONFLICT);

  return create(body);
};

const updateBranch = async (id, body) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  if (body.code && body.code !== branch.code) {
    const existing = await findByCode(body.code);
    if (existing) throw new AppError("Branch code already exists", StatusCodes.CONFLICT);
  }

  return update(id, body);
};

const deleteBranch = async (id) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  // Guard: karyawan aktif
  const empCount = await countActiveEmployees(id);
  if (empCount > 0)
    throw new AppError(
      `Tidak bisa dihapus: ${empCount} karyawan masih terdaftar di cabang ini`,
      StatusCodes.CONFLICT
    );

  // Guard: warehouse yang masih terhubung
  const warehouseCount = await countAssignedWarehouses(id);
  if (warehouseCount > 0)
    throw new AppError(
      `Tidak bisa dihapus: ${warehouseCount} warehouse masih terhubung. Lepas warehouse terlebih dahulu.`,
      StatusCodes.CONFLICT
    );

  // Guard: cek semua relasi lain yang bisa menyebabkan FK constraint error
  const [
    invoiceCount,
    appointmentCount,
    attendanceCount,
    commissionRuleCount,
    staffScheduleCount,
    depositCount,
    paymentCount,
    payrollCount,
    itemPriceCount,
  ] = await Promise.all([
    prisma.invoice.count({ where: { branchId: id } }),
    prisma.appointment.count({ where: { branchId: id } }),
    prisma.attendance.count({ where: { branchId: id } }),
    prisma.branchCommissionRule.count({ where: { branchId: id } }),
    prisma.staffSchedule.count({ where: { branchId: id } }),
    prisma.deposit.count({ where: { branchId: id } }),
    prisma.payment.count({ where: { branchId: id } }),
    prisma.payroll.count({ where: { branchId: id } }),
    prisma.itemPrice.count({ where: { branchId: id } }),
  ]);

  if (invoiceCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${invoiceCount} invoice masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (appointmentCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${appointmentCount} appointment masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (attendanceCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${attendanceCount} data absensi masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (commissionRuleCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${commissionRuleCount} aturan komisi masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (staffScheduleCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${staffScheduleCount} jadwal shift masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (depositCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${depositCount} deposit masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (paymentCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${paymentCount} pembayaran masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (payrollCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${payrollCount} payroll masih terhubung ke cabang ini`, StatusCodes.CONFLICT);
  if (itemPriceCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${itemPriceCount} harga item masih terhubung ke cabang ini`, StatusCodes.CONFLICT);

  return hardDelete(id);
};

module.exports = { getAll, getById, createBranch, updateBranch, deleteBranch };
