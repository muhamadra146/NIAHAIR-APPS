const prisma = require("../../config/prisma");

// Kategori item yang dapat diskon (lihat membership.discount.js)
const INCLUDE = {
  discountCategories: {
    select:  { categoryId: true, category: { select: { id: true, name: true, parentId: true } } },
    orderBy: { category: { name: "asc" } },
  },
};

/** discountCategories → bentuk nested write Prisma (ganti seluruh daftar) */
const categoriesWrite = (categoryIds, replace) => ({
  ...(replace ? { deleteMany: {} } : {}),
  create: categoryIds.map((categoryId) => ({ categoryId })),
});

const findAll = ({ skip, take, where }) =>
  prisma.membership.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: INCLUDE });

const count = (where) => prisma.membership.count({ where });

const findById = (id) => prisma.membership.findUnique({ where: { id }, include: INCLUDE });

const create = ({ categoryIds = [], ...data }) =>
  prisma.membership.create({ data: { ...data, discountCategories: categoriesWrite(categoryIds, false) }, include: INCLUDE });

/** categoryIds undefined = daftar kategori tidak diubah */
const update = (id, { categoryIds, ...data }) =>
  prisma.membership.update({
    where: { id },
    data:  { ...data, ...(categoryIds !== undefined && { discountCategories: categoriesWrite(categoryIds, true) }) },
    include: INCLUDE,
  });

const countCategories = (ids) => prisma.itemCategory.count({ where: { id: { in: ids } } });

/** Kategori default paket baru: JASA (semua treatment) */
const findDefaultDiscountCategory = () =>
  prisma.itemCategory.findFirst({ where: { name: "JASA", parentId: null }, select: { id: true } });

const remove = (id) => prisma.membership.delete({ where: { id } });

const countCustomers = (membershipId) =>
  prisma.customer.count({ where: { membershipId } });

const findCustomerWithMembership = (customerId) =>
  prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      membership: true,
      customerMemberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

const findActiveCustomerMembership = (customerId) =>
  prisma.customerMembership.findFirst({
    where: { customerId, status: "ACTIVE" },
    include: { membership: true },
    orderBy: { createdAt: "desc" },
  });

const findActiveMembership = (customerId) =>
  prisma.customerMembership.findFirst({
    where: {
      customerId,
      status: "ACTIVE",
      endDate: { gt: new Date() },
    },
    include: { membership: { include: INCLUDE } },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

module.exports = {
  findAll, count, findById, create, update, remove, countCustomers, countCategories, findDefaultDiscountCategory,
  findCustomerWithMembership, findActiveCustomerMembership, findActiveMembership,
};
