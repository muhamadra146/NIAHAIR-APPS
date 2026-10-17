const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update, findCashAccountById } = require("./paymentMethod.repository");

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
  if (!pm) throw new AppError("Metode pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);
  return pm;
};

// Akun kas yang ditautkan harus ada dan aktif (G5-14). null/"" = tanpa akun kas.
const resolveCashAccountId = async (cashAccountId) => {
  if (cashAccountId === null || cashAccountId === undefined || cashAccountId === "") return null;
  const account = await findCashAccountById(cashAccountId);
  if (!account) throw new AppError("Akun kas tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!account.isActive) {
    throw new AppError(`Akun kas "${account.name}" tidak aktif dan tidak bisa ditautkan`, StatusCodes.UNPROCESSABLE_ENTITY);
  }
  return account.id;
};

const createPaymentMethod = async (body) => {
  const code = body.code.trim().toUpperCase();

  const existing = await findByCode(code);
  if (existing) throw new AppError("Kode metode pembayaran sudah digunakan", StatusCodes.CONFLICT);

  return create({
    code,
    name:          body.name.trim(),
    cashAccountId: await resolveCashAccountId(body.cashAccountId),
  });
};

const updatePaymentMethod = async (id, body) => {
  const pm = await findById(id);
  if (!pm) throw new AppError("Metode pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);

  const data = {};
  if (body.name          !== undefined) data.name          = body.name;
  if (body.isActive      !== undefined) data.isActive      = body.isActive;
  if (body.cashAccountId !== undefined) {
    // Tautan yang sama (mis. akun kas lama sudah nonaktif) tidak dicek ulang
    data.cashAccountId = body.cashAccountId && body.cashAccountId === pm.cashAccountId
      ? pm.cashAccountId
      : await resolveCashAccountId(body.cashAccountId);
  }

  if (body.code !== undefined) {
    const code = body.code.trim().toUpperCase();
    const existing = await findByCode(code);
    if (existing && existing.id !== id) {
      throw new AppError("Kode metode pembayaran sudah digunakan", StatusCodes.CONFLICT);
    }
    data.code = code;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("Tidak ada data yang diubah", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  return update(id, data);
};

const deletePaymentMethod = async (id) => {
  const pm = await findById(id);
  if (!pm) throw new AppError("Metode pembayaran tidak ditemukan", StatusCodes.NOT_FOUND);
  return update(id, { isActive: false });
};

module.exports = { listPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod };
