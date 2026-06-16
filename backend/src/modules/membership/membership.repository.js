const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.membership.findMany({ where, orderBy: { createdAt: "desc" }, skip, take });

const count = (where) => prisma.membership.count({ where });

const findById = (id) => prisma.membership.findUnique({ where: { id } });

const create = (data) => prisma.membership.create({ data });

const update = (id, data) => prisma.membership.update({ where: { id }, data });

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

module.exports = {
  findAll, count, findById, create, update, remove, countCustomers,
  findCustomerWithMembership, findActiveCustomerMembership,
};
