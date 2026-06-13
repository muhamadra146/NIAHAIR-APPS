const { StatusCodes }    = require("http-status-codes");
const AppError           = require("../../common/errors/AppError");
const repo               = require("./loan.repository");

const getAll = async ({ employeeId, branchId, status, page = 1, limit = 20 }) => {
  const [rows, total] = await Promise.all([
    repo.findAll({ employeeId, branchId, status, page, limit }),
    repo.count({ employeeId, branchId, status }),
  ]);
  return {
    data: rows,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getByEmployee = async (employeeId) => repo.findByEmployee(employeeId);

const getById = async (id) => {
  const loan = await repo.findById(id);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  return loan;
};

const createLoan = async (body) => {
  const loanNo = await repo.generateLoanNo();
  const data = {
    employeeId:       body.employeeId,
    branchId:         body.branchId,
    loanNo,
    totalAmount:      body.totalAmount,
    remainingAmount:  body.totalAmount,
    monthlyDeduction: body.monthlyDeduction,
    startDate:        new Date(body.startDate),
    endDate:          body.endDate ? new Date(body.endDate) : null,
    notes:            body.notes ?? null,
  };
  return repo.create(data);
};

const updateLoan = async (id, body) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "ACTIVE")
    throw new AppError("Only ACTIVE loans can be updated", StatusCodes.BAD_REQUEST);

  const data = {};
  if (body.monthlyDeduction !== undefined) data.monthlyDeduction = body.monthlyDeduction;
  if (body.endDate          !== undefined) data.endDate          = body.endDate ? new Date(body.endDate) : null;
  if (body.notes            !== undefined) data.notes            = body.notes;
  if (body.status           !== undefined) data.status           = body.status;

  return repo.update(id, data);
};

const cancelLoan = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "ACTIVE")
    throw new AppError("Only ACTIVE loans can be cancelled", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "CANCELLED" });
};

const addRepayment = async (loanId, body) => {
  const loan = await repo.findById(loanId);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  if (loan.status !== "ACTIVE")
    throw new AppError("Loan is not active", StatusCodes.BAD_REQUEST);

  const amount = Number(body.amount);
  if (amount <= 0) throw new AppError("Amount must be > 0", StatusCodes.BAD_REQUEST);
  if (amount > Number(loan.remainingAmount))
    throw new AppError("Amount exceeds remaining balance", StatusCodes.BAD_REQUEST);

  return repo.addRepayment(loanId, amount, new Date(body.paidAt), body.notes, body.payrollId);
};

const getRepayments = async (loanId) => {
  const loan = await repo.findById(loanId);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  return repo.findRepaymentsByLoan(loanId);
};

module.exports = { getAll, getByEmployee, getById, createLoan, updateLoan, cancelLoan, addRepayment, getRepayments };
