const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll,
  count,
  findById,
  findActiveByEmployeeAndCategory,
  findDuplicate,
  findEmployeeById,
  findCommissionCategoryById,
  create,
  update,
  deleteById,
} = require("./commissionRule.repository");

const getAll = async ({ page, limit, search, employeeId, commissionCategoryId, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = {};

  if (search) {
    where.OR = [
      { employee:           { name: { contains: search, mode: "insensitive" } } },
      { commissionCategory: { name: { contains: search, mode: "insensitive" } } },
      { commissionCategory: { code: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (employeeId)           where.employeeId           = employeeId;
  if (commissionCategoryId) where.commissionCategoryId = commissionCategoryId;

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [rules, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data: rules, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const rule = await findById(id);
  if (!rule) throw new AppError("Commission rule not found", StatusCodes.NOT_FOUND);
  return rule;
};

const createCommissionRule = async (body) => {
  const employee = await findEmployeeById(body.employeeId);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);

  const category = await findCommissionCategoryById(body.commissionCategoryId);
  if (!category) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);

  if (body.commissionType === "PERCENTAGE" && body.commissionValue > 100) {
    throw new AppError("Percentage commission cannot exceed 100", StatusCodes.BAD_REQUEST);
  }

  const slotKey   = body.slotKey ?? null;
  const duplicate = await findDuplicate(body.employeeId, body.commissionCategoryId, slotKey, body.effectiveDate);
  if (duplicate) {
    throw new AppError(
      "Rule komisi dengan karyawan, kategori, role, dan tanggal berlaku yang sama sudah ada",
      StatusCodes.CONFLICT
    );
  }

  return create({
    employeeId:           body.employeeId,
    commissionCategoryId: body.commissionCategoryId,
    slotKey,
    commissionType:       body.commissionType,
    commissionValue:      body.commissionValue,
    effectiveDate:        new Date(body.effectiveDate),
    endDate:              body.endDate ? new Date(body.endDate) : undefined,
    isActive:             body.isActive !== undefined ? body.isActive : true,
  });
};

const updateCommissionRule = async (id, body) => {
  const rule = await findById(id);
  if (!rule) throw new AppError("Commission rule not found", StatusCodes.NOT_FOUND);

  if (body.employeeId && body.employeeId !== rule.employeeId) {
    const employee = await findEmployeeById(body.employeeId);
    if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  }

  if (body.commissionCategoryId && body.commissionCategoryId !== rule.commissionCategoryId) {
    const category = await findCommissionCategoryById(body.commissionCategoryId);
    if (!category) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);
  }

  if (body.commissionValue !== undefined) {
    const type = body.commissionType || rule.commissionType;
    if (type === "PERCENTAGE" && body.commissionValue > 100) {
      throw new AppError("Percentage commission cannot exceed 100", StatusCodes.BAD_REQUEST);
    }
  }

  const updateData = { ...body };
  if (updateData.effectiveDate) updateData.effectiveDate = new Date(updateData.effectiveDate);
  if (updateData.endDate)       updateData.endDate       = new Date(updateData.endDate);

  return update(id, updateData);
};

const deleteCommissionRule = async (id) => {
  const rule = await findById(id);
  if (!rule) throw new AppError("Commission rule not found", StatusCodes.NOT_FOUND);
  await deleteById(id);
};

module.exports = { getAll, getById, createCommissionRule, updateCommissionRule, deleteCommissionRule };
