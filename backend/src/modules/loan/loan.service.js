const { StatusCodes }    = require("http-status-codes");
const AppError           = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo               = require("./loan.repository");
const { createSyncJob }  = require("../syncQueue/syncQueue.service");

const getAll = async ({ employeeId, branchId, status, page, limit } = {}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [rows, total] = await Promise.all([
    repo.findAll({ employeeId, branchId, status, skip, take }),
    repo.count({ employeeId, branchId, status }),
  ]);
  return {
    data: rows,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getByEmployee = async (employeeId) => repo.findByEmployee(employeeId);

const getById = async (id) => {
  const loan = await repo.findById(id);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  return loan;
};

const createLoan = async (body) => {
  const prisma = require("../../config/prisma");

  // Run number generation + creation in a single transaction so MAX-based numbering
  // is consistent. loanNo @unique in schema is the final guard against duplicates.
  const loan = await prisma.$transaction(async (tx) => {
    const loanNo = await repo.generateLoanNo(tx);
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
    return repo.create(data, tx);
  });

  // Enqueue Accurate sync — loan is created with ACTIVE status by default
  await createSyncJob({
    entityType: "LOAN",
    entityId:   loan.id,
    direction:  "APP_TO_ACCURATE",
  });

  return loan;
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
  // Bug fix #2: status TIDAK boleh diubah langsung via update.
  // Gunakan cancelLoan() atau alur repayment untuk mengubah status.

  return repo.update(id, data);
};

const cancelLoan = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  if (existing.status !== "ACTIVE")
    throw new AppError("Only ACTIVE loans can be cancelled", StatusCodes.BAD_REQUEST);
  const result = await repo.update(id, { status: "CANCELLED" });

  // Bug fix #4: sync ke Accurate saat kasbon di-cancel
  await createSyncJob({
    entityType: "LOAN",
    entityId:   id,
    direction:  "APP_TO_ACCURATE",
  });

  return result;
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

  const repayment = await repo.addRepayment(loanId, amount, new Date(body.paidAt), body.notes, body.payrollId);

  // Bug fix #4: sync ke Accurate saat kasbon lunas (PAID_OFF)
  const updated = await repo.findById(loanId);
  if (updated && updated.status === "PAID_OFF") {
    await createSyncJob({
      entityType: "LOAN",
      entityId:   loanId,
      direction:  "APP_TO_ACCURATE",
    });
  }

  return repayment;
};

const getRepayments = async (loanId) => {
  const loan = await repo.findById(loanId);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  return repo.findRepaymentsByLoan(loanId);
};

// ── Self-service (staff view own loans) ──────────────────────────────────────

const getMyLoans = async (employeeId) => {
  if (!employeeId) throw new AppError("User tidak memiliki data karyawan", StatusCodes.FORBIDDEN);
  return repo.findByEmployee(employeeId);
};

const getMyLoanById = async (id, employeeId) => {
  if (!employeeId) throw new AppError("User tidak memiliki data karyawan", StatusCodes.FORBIDDEN);
  const loan = await repo.findById(id);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);
  if (loan.employeeId !== employeeId)
    throw new AppError("Akses ditolak", StatusCodes.FORBIDDEN);
  return loan;
};

const deleteLoan = async (id) => {
  const loan = await repo.findById(id);
  if (!loan) throw new AppError("Loan not found", StatusCodes.NOT_FOUND);

  // Bug fix #3: cek repayment sebelum delete agar tidak crash FK constraint
  if (loan.repayments && loan.repayments.length > 0) {
    throw new AppError(
      `Kasbon tidak bisa dihapus karena sudah memiliki ${loan.repayments.length} cicilan. Gunakan Cancel untuk menonaktifkan kasbon ini.`,
      StatusCodes.CONFLICT
    );
  }

  await repo.remove(id);
};

module.exports = { getAll, getByEmployee, getById, createLoan, updateLoan, cancelLoan, addRepayment, getRepayments, getMyLoans, getMyLoanById, deleteLoan };
