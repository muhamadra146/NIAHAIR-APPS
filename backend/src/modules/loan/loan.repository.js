const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, code: true, name: true } } } },
  branch:   { select: { id: true, code: true, name: true } },
  repayments: { orderBy: { paidAt: "desc" } },
};

const findAll = ({ employeeId, branchId, status, page, limit }) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  return prisma.loan.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit });
};

const count = ({ employeeId, branchId, status }) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  return prisma.loan.count({ where });
};

const findByEmployee = (employeeId) =>
  prisma.loan.findMany({ where: { employeeId }, include: INCLUDE, orderBy: { createdAt: "desc" } });

const findById = (id) =>
  prisma.loan.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.loan.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.loan.update({ where: { id }, data, include: INCLUDE });

const addRepayment = (loanId, amount, paidAt, notes, payrollId) =>
  prisma.$transaction(async (tx) => {
    const repayment = await tx.loanRepayment.create({
      data: { loanId, amount, paidAt, notes: notes ?? null, payrollId: payrollId ?? null },
    });
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    const newRemaining = Number(loan.remainingAmount) - Number(amount);
    const newStatus    = newRemaining <= 0 ? "PAID_OFF" : "ACTIVE";
    await tx.loan.update({
      where: { id: loanId },
      data:  { remainingAmount: newRemaining < 0 ? 0 : newRemaining, status: newStatus },
    });
    return repayment;
  });

const findRepaymentsByLoan = (loanId) =>
  prisma.loanRepayment.findMany({ where: { loanId }, orderBy: { paidAt: "desc" } });

const generateLoanNo = async () => {
  const count = await prisma.loan.count();
  return `KB${String(count + 1).padStart(5, "0")}`;
};

module.exports = { findAll, count, findByEmployee, findById, create, update, addRepayment, findRepaymentsByLoan, generateLoanNo };
