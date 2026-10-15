const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo     = require("./leaveQuota.repository");
const leaveTypeRepo = require("../leaveType/leaveType.repository");

const getQuotas = async ({ employeeId, year, page, limit } = {}) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (year)       where.year = Number(year);
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    repo.findAll({ skip, take, where }),
    repo.count(where),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// Self-service: kuota milik sendiri — bounded per karyawan (max N jenis cuti)
/** Tambahkan hari menunggu persetujuan & sisa jatah (jatah − terpakai − menunggu) ke tiap kuota */
const withRemaining = async (employeeId, quotas) => {
  const years = [...new Set(quotas.map((q) => q.year))];
  const pendingByYear = Object.fromEntries(await Promise.all(
    years.map(async (y) => [y, await repo.sumPendingDays(employeeId, y)]),
  ));
  return quotas.map((q) => {
    const pendingDays = pendingByYear[q.year]?.[q.leaveTypeId] ?? 0;
    return { ...q, pendingDays, remainingDays: q.totalDays - q.usedDays - pendingDays };
  });
};

const getMyQuotas = async (employeeId, { year, page, limit } = {}) => {
  const where = { employeeId };
  if (year) where.year = Number(year);
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    repo.findAll({ skip, take, where }),
    repo.count(where),
  ]);
  return { data: await withRemaining(employeeId, data), meta: paginationMeta(total, pageNum, limitNum) };
};

const assign = async ({ employeeId, leaveTypeId, year, totalDays }) => {
  if (!employeeId || !leaveTypeId || !year || totalDays === undefined)
    throw new AppError("employeeId, leaveTypeId, year, totalDays are required", StatusCodes.BAD_REQUEST);

  const lt = await leaveTypeRepo.findById(leaveTypeId);
  if (!lt) throw new AppError("Jenis cuti tidak ditemukan", StatusCodes.NOT_FOUND);

  return repo.upsert(employeeId, leaveTypeId, Number(year), Number(totalDays));
};

/** Sisa jatah = jatah − terpakai − pengajuan yang masih menunggu persetujuan */
const getBalance = async (employeeId, leaveTypeId, year) => {
  const q = await repo.findOne(employeeId, leaveTypeId, year);
  if (!q) return null;
  const pendingDays = (await repo.sumPendingDays(employeeId, year, leaveTypeId))[leaveTypeId] ?? 0;
  return { ...q, pendingDays, remainingDays: q.totalDays - q.usedDays - pendingDays };
};

const incrementUsed = (employeeId, leaveTypeId, year, days) =>
  repo.incrementUsed(employeeId, leaveTypeId, Number(year), Number(days));

const decrementUsed = (employeeId, leaveTypeId, year, days) =>
  repo.decrementUsed(employeeId, leaveTypeId, Number(year), Number(days));

module.exports = { getQuotas, getMyQuotas, assign, getBalance, incrementUsed, decrementUsed };
