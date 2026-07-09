const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");

const ORDER_MAP = {
  name:         { name: "asc" },
  "-name":      { name: "desc" },
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  customerNo:   { customerNo: "asc" },
  "-customerNo":{ customerNo: "desc" },
};
const {
  findAll,
  count,
  findById,
  findByCustomerNo,
  findByPhone,
  findByEmail,
  findMaxCustomerNo,
  create,
  update,
} = require("./customer.repository");
const { createSyncJob } = require("../syncQueue/syncQueue.service");

// ── Auto generate customer number: CUS-000001 ─────────────────────────
const buildCustomerNo = async () => {
  const maxSeq = await findMaxCustomerNo();
  return `CUS-${String(maxSeq + 1).padStart(6, "0")}`;
};

const getAll = async ({ page, limit, search, isActive, syncStatus, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);

  const where = {};

  if (search) {
    where.OR = [
      { name:       { contains: search, mode: "insensitive" } },
      { email:      { contains: search, mode: "insensitive" } },
      { mobilePhone: { contains: search, mode: "insensitive" } },
      { customerNo:  { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  if (syncStatus) where.syncStatus = syncStatus;

  const [customers, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
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
  // CRM-001 + CRM-005: Duplicate detection by phone
  if (body.mobilePhone) {
    const byPhone = await findByPhone(body.mobilePhone);
    if (byPhone) {
      throw new AppError(
        `Customer dengan nomor telepon ${body.mobilePhone} sudah ada (${byPhone.name} / ${byPhone.customerNo ?? byPhone.id})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  // CRM-001: Duplicate detection by email
  if (body.email) {
    const byEmail = await findByEmail(body.email);
    if (byEmail) {
      throw new AppError(
        `Customer dengan email ${body.email} sudah ada (${byEmail.name} / ${byEmail.customerNo ?? byEmail.id})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  if (body.birthDate) body.birthDate = new Date(body.birthDate);

  // CRM-002: Auto-generate customer number (never allow manual input)
  // Retry once on P2002 unique collision from concurrent requests
  let customer;
  try {
    const customerNo = await buildCustomerNo();
    customer = await create({ ...body, customerNo });
  } catch (err) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("customerNo")) {
      const customerNo = await buildCustomerNo();
      customer = await create({ ...body, customerNo });
    } else {
      throw err;
    }
  }

  // Queue Accurate push — worker picks it up asynchronously
  await createSyncJob({
    entityType: "CUSTOMER",
    entityId:   customer.id,
    direction:  "APP_TO_ACCURATE",
  });

  return { customer, message: "Customer created, sync queued" };
};

const updateCustomer = async (id, body) => {
  const customer = await findById(id);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  // CRM-005: Phone uniqueness check on update
  if (body.mobilePhone && body.mobilePhone !== customer.mobilePhone) {
    const byPhone = await findByPhone(body.mobilePhone);
    if (byPhone) {
      throw new AppError(
        `Nomor telepon ${body.mobilePhone} sudah digunakan oleh customer lain (${byPhone.name})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  // CRM-001: Email uniqueness check on update
  if (body.email && body.email !== customer.email) {
    const byEmail = await findByEmail(body.email);
    if (byEmail) {
      throw new AppError(
        `Email ${body.email} sudah digunakan oleh customer lain (${byEmail.name})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  // CRM-002: customerNo tidak boleh diubah
  delete body.customerNo;

  if (body.birthDate) body.birthDate = new Date(body.birthDate);

  return update(id, body);
};

module.exports = { getAll, getById, createCustomer, updateCustomer };
