const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update } = require("./cashAccount.repository");

const listCashAccounts = async ({ page, limit, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

const getCashAccountById = async (id) => {
  const account = await findById(id);
  if (!account) throw new AppError("Cash account not found", StatusCodes.NOT_FOUND);
  return account;
};

const createCashAccount = async (body) => {
  const code = body.code.toUpperCase();

  const existing = await findByCode(code);
  if (existing) throw new AppError("Cash account code already exists", StatusCodes.CONFLICT);

  return create({
    code,
    name:              body.name,
    accurateAccountId: body.accurateAccountId ?? null,
    accurateAccountNo: body.accurateAccountNo ?? null,
  });
};

const updateCashAccount = async (id, body) => {
  const account = await findById(id);
  if (!account) throw new AppError("Cash account not found", StatusCodes.NOT_FOUND);

  const data = {};
  if (body.name              !== undefined) data.name              = body.name;
  if (body.accurateAccountId !== undefined) data.accurateAccountId = body.accurateAccountId;
  if (body.accurateAccountNo !== undefined) data.accurateAccountNo = body.accurateAccountNo;
  if (body.isActive          !== undefined) data.isActive          = body.isActive;

  if (Object.keys(data).length === 0) {
    throw new AppError("No updatable fields provided", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  return update(id, data);
};

// Soft delete
const deleteCashAccount = async (id) => {
  const account = await findById(id);
  if (!account) throw new AppError("Cash account not found", StatusCodes.NOT_FOUND);
  return update(id, { isActive: false });
};

module.exports = { listCashAccounts, getCashAccountById, createCashAccount, updateCashAccount, deleteCashAccount };
