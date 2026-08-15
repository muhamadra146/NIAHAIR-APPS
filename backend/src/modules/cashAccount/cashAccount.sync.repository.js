const prisma = require("../../config/prisma");

const findByAccurateAccountId = (accurateAccountId) =>
  prisma.cashAccount.findUnique({ where: { accurateAccountId } });

const upsertCashAccount = ({ accurateAccountId, accurateAccountNo, code, name }) =>
  prisma.cashAccount.upsert({
    where: { accurateAccountId },
    create: {
      accurateAccountId,
      accurateAccountNo,
      code,
      name,
      isActive: true,
    },
    update: {
      accurateAccountNo,
      code,
      name,
      isActive: true,
    },
  });

const findAllActiveAccurateIds = () =>
  prisma.cashAccount.findMany({
    where:  { isActive: true, accurateAccountId: { not: null } },
    select: { id: true, accurateAccountId: true },
  });

const deactivateManyByIds = (ids) =>
  prisma.cashAccount.updateMany({
    where: { id: { in: ids } },
    data:  { isActive: false },
  });

module.exports = { findByAccurateAccountId, upsertCashAccount, findAllActiveAccurateIds, deactivateManyByIds };
