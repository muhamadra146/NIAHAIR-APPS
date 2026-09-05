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
const getMyQuotas = async (employeeId, { year, page, limit } = {}) => {
  const where = { employeeId };
  if (year) where.year = Number(year);
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    repo.findAll({ skip, take, where }),
    repo.count(where),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

const assign = async ({ employeeId, leaveTypeId, year, totalDays }) => {
  if (!employeeId || !leaveTypeId || !year || totalDays === undefined)
    throw new AppError("employeeId, leaveTypeId, year, totalDays are required", StatusCodes.BAD_REQUEST);

  const lt = await leaveTypeRepo.findById(leaveTypeId);
  if (!lt) throw new AppError("Leave type not found", StatusCodes.NOT_FOUND);

  return repo.upsert(employeeId, leaveTypeId, Number(year), Number(totalDays));
};

const getBalance = async (employeeId, leaveTypeId, year) => {
  const q = await repo.findOne(employeeId, leaveTypeId, year);
  if (!q) return null;
  return { ...q, remainingDays: q.totalDays - q.usedDays };
};

const incrementUsed = (employeeId, leaveTypeId, year, days) =>
  repo.incrementUsed(employeeId, leaveTypeId, Number(year), Number(days));

const decrementUsed = (employeeId, leaveTypeId, year, days) =>
  repo.decrementUsed(employeeId, leaveTypeId, Number(year), Number(days));

module.exports = { getQuotas, getMyQuotas, assign, getBalance, incrementUsed, decrementUsed };
