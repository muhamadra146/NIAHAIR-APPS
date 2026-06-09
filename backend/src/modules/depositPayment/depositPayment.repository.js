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
  paidAt:                true,
  createdAt:             true,
  updatedAt:             true,
  deposit: {
    select: {
      id:                    true,
      amount:                true,
      status:                true,
      notes:                 true,
      accurateDepositId:     true,
      accurateDepositNumber: true,
      appointment: {
        select: {
          customer: {
            select: { id: true, name: true, customerNo: true, accurateCustomerId: true },
          },
        },
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

const countToday = (startOfDay) =>
  prisma.depositPayment.count({ where: { createdAt: { gte: startOfDay } } });

const findDepositForPayment = (id) =>
  prisma.deposit.findUnique({
    where: { id },
    select: {
      id:     true,
      amount: true,
      status: true,
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

module.exports = {
  findAll,
  count,
  findById,
  findByDepositId,
  countToday,
  findDepositForPayment,
  findPaymentMethodById,
  create,
  markDepositPaid,
};
