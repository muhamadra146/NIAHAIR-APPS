const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update } = require("./paymentMethod.repository");

const listPaymentMethods = async ({ page, limit, isActive }) => {
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

const getPaymentMethodById = async (id) => {
  const pm = await findById(id);
  if (!pm) throw new AppError("Payment method not found", StatusCodes.NOT_FOUND);
  return pm;
};

const createPaymentMethod = async (body) => {
  const code = body.code.toUpperCase();

  const existing = await findByCode(code);
  if (existing) throw new AppError("Payment method code already exists", StatusCodes.CONFLICT);

  return create({
    code,
    name:          body.name,
    cashAccountId: body.cashAccountId ?? null,
  });
};

const updatePaymentMethod = async (id, body) => {
  const pm = await findById(id);
  if (!pm) throw new AppError("Payment method not found", StatusCodes.NOT_FOUND);

  const data = {};
  if (body.name          !== undefined) data.name          = body.name;
  if (body.isActive      !== undefined) data.isActive      = body.isActive;
  if (body.cashAccountId !== undefined) data.cashAccountId = body.cashAccountId ?? null;

  if (body.code !== undefined) {
    const code = body.code.toUpperCase();
    const existing = await findByCode(code);
    if (existing && existing.id !== id) {
      throw new AppError("Payment method code already exists", StatusCodes.CONFLICT);
    }
    data.code = code;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("No updatable fields provided", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  return update(id, data);
};

const deletePaymentMethod = async (id) => {
  const pm = await findById(id);
  if (!pm) throw new AppError("Payment method not found", StatusCodes.NOT_FOUND);
  return update(id, { isActive: false });
};

module.exports = { listPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod };
