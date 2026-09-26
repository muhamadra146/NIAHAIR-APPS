const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const repo            = require("./omsetBonusTier.repository");

// ── List tiers per employee ──────────────────────────────────────────────────
const getByEmployee = async (employeeId) => {
  // Validate employee exists
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  return repo.findByEmployee(employeeId);
};

// ── Create tier ──────────────────────────────────────────────────────────────
const create = async (employeeId, body) => {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);

  if (Number(body.minimumOmset) < 0)
    throw new AppError("minimumOmset harus >= 0", StatusCodes.BAD_REQUEST);
  if (Number(body.percentage) <= 0 || Number(body.percentage) > 100)
    throw new AppError("percentage harus antara 0 dan 100", StatusCodes.BAD_REQUEST);

  return repo.create({
    employeeId,
    minimumOmset: body.minimumOmset,
    percentage:   body.percentage,
    sortOrder:    body.sortOrder ?? 0,
  });
};

// ── Update tier ──────────────────────────────────────────────────────────────
const update = async (id, body) => {
  const tier = await repo.findById(id);
  if (!tier) throw new AppError("Omset bonus tier not found", StatusCodes.NOT_FOUND);

  const data = {};
  if (body.minimumOmset !== undefined) {
    if (Number(body.minimumOmset) < 0)
      throw new AppError("minimumOmset harus >= 0", StatusCodes.BAD_REQUEST);
    data.minimumOmset = body.minimumOmset;
  }
  if (body.percentage !== undefined) {
    if (Number(body.percentage) <= 0 || Number(body.percentage) > 100)
      throw new AppError("percentage harus antara 0 dan 100", StatusCodes.BAD_REQUEST);
    data.percentage = body.percentage;
  }
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  return repo.update(id, data);
};

// ── Delete tier ──────────────────────────────────────────────────────────────
const remove = async (id) => {
  const tier = await repo.findById(id);
  if (!tier) throw new AppError("Omset bonus tier not found", StatusCodes.NOT_FOUND);
  await repo.remove(id);
};

module.exports = { getByEmployee, create, update, remove };
