const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll,
  count,
  findById,
  findByCustomerNo,
  create,
  update,
} = require("./customer.repository");

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { mobilePhone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [customers, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data: customers,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const customer = await findById(id);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);
  return customer;
};

const createCustomer = async (body) => {
  if (body.customerNo) {
    const existing = await findByCustomerNo(body.customerNo);
    if (existing) throw new AppError("Customer number already exists", StatusCodes.CONFLICT);
  }

  if (body.birthDate) {
    body.birthDate = new Date(body.birthDate);
  }

  return create(body);
};

const updateCustomer = async (id, body) => {
  const customer = await findById(id);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  if (body.customerNo && body.customerNo !== customer.customerNo) {
    const existing = await findByCustomerNo(body.customerNo);
    if (existing) throw new AppError("Customer number already exists", StatusCodes.CONFLICT);
  }

  if (body.birthDate) {
    body.birthDate = new Date(body.birthDate);
  }

  return update(id, body);
};

module.exports = { getAll, getById, createCustomer, updateCustomer };
