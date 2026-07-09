const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.customer.findMany({
    skip,
    take,
    where,
    orderBy: orderBy ?? { createdAt: "desc" },
    include: {
      membership: { select: { id: true, name: true } },
    },
  });

const count = (where) => prisma.customer.count({ where });

const findById = (id) =>
  prisma.customer.findUnique({
    where: { id },
    include: {
      membership: { select: { id: true, name: true } },
    },
  });

const findByCustomerNo = (customerNo) =>
  prisma.customer.findUnique({ where: { customerNo } });

const findByPhone = (mobilePhone) =>
  prisma.customer.findUnique({ where: { mobilePhone } });

const findByEmail = (email) =>
  prisma.customer.findFirst({ where: { email } });

const findMaxCustomerNo = async () => {
  const result = await prisma.$queryRaw`
    SELECT "customerNo"
    FROM "customers"
    WHERE "customerNo" LIKE 'CUS-%'
    ORDER BY "customerNo" DESC
    LIMIT 1
  `;
  if (!result || result.length === 0) return 0;
  const last = result[0].customerNo;
  const seq  = parseInt(last.replace("CUS-", ""), 10);
  return isNaN(seq) ? 0 : seq;
};

const create = (data) => prisma.customer.create({ data });

const update = (id, data) =>
  prisma.customer.update({ where: { id }, data });

module.exports = {
  findAll,
  count,
  findById,
  findByCustomerNo,
  findByPhone,
  findByEmail,
  findMaxCustomerNo,
  create,
  update,
};
