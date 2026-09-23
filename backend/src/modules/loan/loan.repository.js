const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, code: true, name: true } } } },
  branch:   { select: { id: true, code: true, name: true } },
  repayments: {
    orderBy: { paidAt: "desc" },
    include: {
      payroll: { select: { periodStart: true, periodEnd: true } },
    },
  },
};

const findAll = ({ employeeId, branchId, status, skip = 0, take = 10 }) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  return prisma.loan.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });
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

const create = (data, tx) =>
  (tx ?? prisma).loan.create({ data, include: INCLUDE });

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

const generateLoanNo = async (tx) => {
  // Use MAX-based approach inside the caller's transaction to avoid COUNT race conditions.
  // loanNo has a @unique constraint in schema — DB is the final guard against duplicates.
  const db   = tx ?? prisma;
  const last = await db.loan.findFirst({ orderBy: { loanNo: "desc" }, select: { loanNo: true } });
  const lastNum = last ? (parseInt(last.loanNo.replace(/\D/g, ""), 10) || 0) : 0;
  return `KB${String(lastNum + 1).padStart(5, "0")}`;
};

const remove = (id) =>
  prisma.loan.delete({ where: { id } });

module.exports = { findAll, count, findByEmployee, findById, create, update, addRepayment, findRepaymentsByLoan, generateLoanNo, remove };
