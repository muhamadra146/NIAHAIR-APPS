const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const repo     = require("./leaveType.repository");

const getAll = (includeInactive = false) =>
  repo.findAll(includeInactive ? {} : { isActive: true });

const getById = async (id) => {
  const t = await repo.findById(id);
  if (!t) throw new AppError("Leave type not found", StatusCodes.NOT_FOUND);
  return t;
};

const create = async ({ code, name, maxDaysPerYear = 12, isPaid = true }) => {
  const existing = await repo.findByCode(code.toUpperCase());
  if (existing) throw new AppError("Leave type code already exists", StatusCodes.CONFLICT);
  return repo.create({ code: code.toUpperCase(), name, maxDaysPerYear, isPaid });
};

const update = async (id, body) => {
  await getById(id);
  const data = {};
  if (body.name           !== undefined) data.name           = body.name;
  if (body.maxDaysPerYear !== undefined) data.maxDaysPerYear = Number(body.maxDaysPerYear);
  if (body.isPaid         !== undefined) data.isPaid         = body.isPaid;
  if (body.isActive       !== undefined) data.isActive       = body.isActive;
  return repo.update(id, data);
};

module.exports = { getAll, getById, create, update };
