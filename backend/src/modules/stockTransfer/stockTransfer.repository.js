const prisma = require("../../config/prisma");

const INCLUDE = {
  sourceWarehouse:      { select: { id: true, name: true, branchId: true, branch: { select: { id: true, code: true, name: true } } } },
  destinationWarehouse: { select: { id: true, name: true, branchId: true, branch: { select: { id: true, code: true, name: true } } } },
  items: {
    include: {
      item: { select: { id: true, name: true, itemCode: true, itemType: true } },
    },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.stockTransfer.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });

const count = (where) => prisma.stockTransfer.count({ where });

const findById = (id) => prisma.stockTransfer.findUnique({ where: { id }, include: INCLUDE });

const create = (data, items, tx = prisma) =>
  tx.stockTransfer.create({
    data: {
      ...data,
      items: { create: items },
    },
    include: INCLUDE,
  });

const update = (id, data) =>
  prisma.stockTransfer.update({ where: { id }, data, include: INCLUDE });

const findMaxSeqToday = async (prefix, tx = prisma) => {
  const last = await tx.stockTransfer.findFirst({
    where:   { transferNo: { startsWith: prefix } },
    orderBy: { transferNo: "desc" },
    select:  { transferNo: true },
  });
  if (!last) return 0;
  const seq = parseInt(last.transferNo.slice(prefix.length), 10);
  return isNaN(seq) ? 0 : seq;
};

module.exports = { findAll, count, findById, create, update, findMaxSeqToday };
