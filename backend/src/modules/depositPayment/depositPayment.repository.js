const prisma = require("../../config/prisma");

const SELECT = {
  id:                    true,
  depositId:             true,
  paymentMethodId:       true,
  amount:                true,
  paymentNo:             true,
  accurateReceiptId:     true,
  accurateReceiptNumber: true,
  lastSyncAt:            true,
  referenceNo:           true,
  notes:                 true,
  transferProofUrl:      true,
  transferProofPublicId: true,
  paidAt:                true,
  createdAt:             true,
  updatedAt:             true,
  deposit: {
    select: {
      id:                    true,
      amount:                true,
      status:                true,
      notes:                 true,
      branchId:              true,
      accurateDepositId:     true,
      accurateDepositNumber: true,
      customer: {
        select: { id: true, name: true, customerNo: true, mobilePhone: true, accurateCustomerId: true },
      },
      branch: {
        select: { id: true, code: true, name: true },
      },
    },
  },
  paymentMethod: {
    select: {
      id:       true,
      name:     true,
      code:     true,
      isActive: true,
      cashAccount: {
        select: { id: true, accurateAccountId: true, accurateAccountNo: true },
      },
    },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.depositPayment.findMany({ skip, take, where, select: SELECT, orderBy: { createdAt: "desc" } });

const count = (where) => prisma.depositPayment.count({ where });

const findById = (id) =>
  prisma.depositPayment.findUnique({ where: { id }, select: SELECT });

const findByDepositId = (depositId) =>
  prisma.depositPayment.findMany({ where: { depositId }, select: SELECT, orderBy: { createdAt: "asc" } });

/** Nomor terbesar berawalan prefix (mis. "PAY-20261015-") — dasar nomor berikutnya */
const findLastNumber = async (prefix) => {
  const row = await prisma.depositPayment.findFirst({
    where:   { paymentNo: { startsWith: prefix } },
    orderBy: { paymentNo: "desc" },
    select:  { paymentNo: true },
  });
  return row?.paymentNo ?? null;
};

const findDepositForPayment = (id) =>
  prisma.deposit.findUnique({
    where: { id },
    select: {
      id:     true,
      amount: true,
      status: true,
      _count: { select: { invoiceDeposits: true } },
    },
  });

const findPaymentMethodById = (id) =>
  prisma.paymentMethod.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

const create = (data) =>
  prisma.depositPayment.create({ data, select: SELECT });

// Mark deposit as fully paid — called immediately after DepositPayment is created
const markDepositPaid = (id, paidAt) =>
  prisma.deposit.update({
    where: { id },
    data:  { status: "PAID", paidAt },
  });

const removeDepositPayment = (id) =>
  prisma.depositPayment.delete({ where: { id } });

const revertDepositToUnpaid = (id) =>
  prisma.deposit.update({
    where: { id },
    data:  { status: "UNPAID", paidAt: null },
  });

module.exports = {
  findAll,
  count,
  findById,
  findByDepositId,
  findLastNumber,
  findDepositForPayment,
  findPaymentMethodById,
  create,
  markDepositPaid,
  removeDepositPayment,
  revertDepositToUnpaid,
};
