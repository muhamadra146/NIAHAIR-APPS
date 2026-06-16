const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma = require("../../config/prisma");
const repo = require("./membership.repository");

const getAll = async ({ page = 1, limit = 20 } = {}) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const m = await repo.findById(id);
  if (!m) throw new AppError("Membership tidak ditemukan", StatusCodes.NOT_FOUND);
  return m;
};

const create = async (body) => {
  const { name, price, durationDays, discountType, discountValue } = body;
  return repo.create({ name, price, durationDays, discountType, discountValue });
};

const update = async (id, body) => {
  await getById(id);
  const { name, price, durationDays, discountType, discountValue } = body;
  const data = {};
  if (name          !== undefined) data.name          = name;
  if (price         !== undefined) data.price         = price;
  if (durationDays  !== undefined) data.durationDays  = durationDays;
  if (discountType  !== undefined) data.discountType  = discountType;
  if (discountValue !== undefined) data.discountValue = discountValue;
  return repo.update(id, data);
};

const remove = async (id) => {
  await getById(id);
  const usedCount = await repo.countCustomers(id);
  if (usedCount > 0) {
    throw new AppError(
      `Tidak bisa menghapus membership yang masih digunakan oleh ${usedCount} pelanggan`,
      StatusCodes.BAD_REQUEST
    );
  }
  return repo.remove(id);
};

const getCustomerMembership = async (customerId) => {
  const customer = await repo.findCustomerWithMembership(customerId);
  if (!customer) throw new AppError("Customer tidak ditemukan", StatusCodes.NOT_FOUND);
  return {
    customer: { id: customer.id, name: customer.name },
    activeMembership: customer.membership ?? null,
    activeRecord: customer.customerMemberships[0] ?? null,
  };
};

const assignMembership = async (customerId, membershipId, createdBy) => {
  const [customer, membership] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    repo.findById(membershipId),
  ]);
  if (!customer)   throw new AppError("Customer tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!membership) throw new AppError("Membership tidak ditemukan", StatusCodes.NOT_FOUND);

  const now      = new Date();
  const endDate  = new Date(now);
  endDate.setUTCDate(endDate.getUTCDate() + membership.durationDays);

  return prisma.$transaction(async (tx) => {
    // Expire any existing active membership record
    await tx.customerMembership.updateMany({
      where: { customerId, status: "ACTIVE" },
      data:  { status: "EXPIRED" },
    });

    // Create new CustomerMembership record
    const record = await tx.customerMembership.create({
      data: { customerId, membershipId, startDate: now, endDate, status: "ACTIVE" },
      include: { membership: true },
    });

    // Update customer's active membershipId FK
    await tx.customer.update({ where: { id: customerId }, data: { membershipId } });

    // Log to history
    await tx.membershipHistory.create({
      data: { customerId, membershipId, startDate: now, endDate, createdBy: createdBy ?? null },
    });

    return record;
  });
};

const cancelMembership = async (customerId) => {
  const active = await repo.findActiveCustomerMembership(customerId);
  if (!active) throw new AppError("Customer tidak memiliki membership aktif", StatusCodes.BAD_REQUEST);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.customerMembership.update({
      where: { id: active.id },
      data:  { status: "CANCELLED" },
      include: { membership: true },
    });
    await tx.customer.update({ where: { id: customerId }, data: { membershipId: null } });
    return updated;
  });
};

module.exports = { getAll, getById, create, update, remove, getCustomerMembership, assignMembership, cancelMembership };
