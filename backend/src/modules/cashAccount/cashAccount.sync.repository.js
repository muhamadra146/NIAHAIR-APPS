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

module.exports = { findByAccurateAccountId, upsertCashAccount };
