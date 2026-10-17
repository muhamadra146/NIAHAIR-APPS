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
  if (!branch) throw new AppError("Cabang tidak ditemukan", StatusCodes.NOT_FOUND);
  return branch;
};

// Nama & kode di-trim, kode disimpan huruf besar (G5-17)
const normalizeBranchInput = (body) => {
  const data = { ...body };
  if (typeof data.name === "string") data.name = data.name.trim();
  if (typeof data.code === "string") data.code = data.code.trim().toUpperCase();
  if (data.name === "") throw new AppError("Nama cabang wajib diisi", StatusCodes.BAD_REQUEST);
  if (data.code === "") throw new AppError("Kode cabang wajib diisi", StatusCodes.BAD_REQUEST);
  return data;
};

// Titik lokasi absen: latitude & longitude diisi berdua atau tidak sama sekali (G5-06)
const assertCoordinatePair = (latitude, longitude) => {
  const hasLat = latitude !== undefined && latitude !== null;
  const hasLng = longitude !== undefined && longitude !== null;
  if (hasLat !== hasLng) {
    throw new AppError("Latitude dan longitude harus diisi bersamaan", StatusCodes.BAD_REQUEST);
  }
};

const createBranch = async (body) => {
  const data = normalizeBranchInput(body);
  assertCoordinatePair(data.latitude, data.longitude);

  const existing = await findByCode(data.code);
  if (existing) throw new AppError("Kode cabang sudah digunakan", StatusCodes.CONFLICT);

  return create(data);
};

const updateBranch = async (id, body) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Cabang tidak ditemukan", StatusCodes.NOT_FOUND);

  const data = normalizeBranchInput(body);
  assertCoordinatePair(
    data.latitude  !== undefined ? data.latitude  : branch.latitude,
    data.longitude !== undefined ? data.longitude : branch.longitude,
  );

  if (data.code && data.code !== branch.code) {
    const existing = await findByCode(data.code);
    if (existing && existing.id !== id) throw new AppError("Kode cabang sudah digunakan", StatusCodes.CONFLICT);
  }

  return update(id, data);
};

const deleteBranch = async (id) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Cabang tidak ditemukan", StatusCodes.NOT_FOUND);

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
    staffScheduleCount,
    depositCount,
    paymentCount,
    payrollCount,
    itemPriceCount,
  ] = await Promise.all([
    prisma.invoice.count({ where: { branchId: id } }),
    prisma.appointment.count({ where: { branchId: id } }),
    prisma.attendance.count({ where: { branchId: id } }),
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
