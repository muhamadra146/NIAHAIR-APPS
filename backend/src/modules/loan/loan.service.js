const { StatusCodes }    = require("http-status-codes");
const AppError           = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo               = require("./loan.repository");

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
  if (!loan) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);
  return loan;
};

// ── Validasi nilai kasbon ────────────────────────────────────────────
const toDate = (value, label) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError(`${label} tidak valid`, StatusCodes.BAD_REQUEST);
  return d;
};

const assertDeductionWithinTotal = (monthlyDeduction, totalAmount) => {
  if (Number(monthlyDeduction) > Number(totalAmount)) {
    throw new AppError("Potongan per bulan tidak boleh melebihi total kasbon", StatusCodes.BAD_REQUEST);
  }
};

const assertDateOrder = (startDate, endDate) => {
  if (!endDate) return;
  if (toDate(endDate, "Tanggal selesai") < toDate(startDate, "Tanggal mulai")) {
    throw new AppError("Tanggal selesai tidak boleh sebelum tanggal mulai", StatusCodes.BAD_REQUEST);
  }
};

const createLoan = async (body) => {
  const prisma = require("../../config/prisma");

  assertDeductionWithinTotal(body.monthlyDeduction, body.totalAmount);
  assertDateOrder(body.startDate, body.endDate);

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

  // Kasbon tidak di-sync ke Accurate; tercatat lewat jurnal payroll (potongan kasbon)
  return loan;
};

const updateLoan = async (id, body) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "ACTIVE")
    throw new AppError("Hanya kasbon aktif yang bisa diubah", StatusCodes.BAD_REQUEST);

  if (body.monthlyDeduction !== undefined) assertDeductionWithinTotal(body.monthlyDeduction, existing.totalAmount);
  if (body.endDate) assertDateOrder(existing.startDate, body.endDate);

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
  if (!existing) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "ACTIVE")
    throw new AppError("Hanya kasbon aktif yang bisa dibatalkan", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "CANCELLED" });
};

const addRepayment = async (loanId, body) => {
  const loan = await repo.findById(loanId);
  if (!loan) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);
  if (loan.status !== "ACTIVE")
    throw new AppError("Kasbon tidak aktif", StatusCodes.BAD_REQUEST);

  const amount = Number(body.amount);
  if (amount <= 0) throw new AppError("Nominal harus lebih dari 0", StatusCodes.BAD_REQUEST);
  if (amount > Number(loan.remainingAmount))
    throw new AppError("Nominal melebihi sisa kasbon", StatusCodes.BAD_REQUEST);

  return repo.addRepayment(loanId, amount, new Date(body.paidAt), body.notes, body.payrollId);
};

const getRepayments = async (loanId) => {
  const loan = await repo.findById(loanId);
  if (!loan) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);
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
  if (!loan) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);
  if (loan.employeeId !== employeeId)
    throw new AppError("Akses ditolak", StatusCodes.FORBIDDEN);
  return loan;
};

const deleteLoan = async (id) => {
  const loan = await repo.findById(id);
  if (!loan) throw new AppError("Kasbon tidak ditemukan", StatusCodes.NOT_FOUND);

  // Bug fix #3: cek repayment sebelum delete agar tidak crash FK constraint
  if (loan.repayments && loan.repayments.length > 0) {
    throw new AppError(
      `Kasbon tidak bisa dihapus karena sudah memiliki ${loan.repayments.length} cicilan. Gunakan Cancel untuk menonaktifkan kasbon ini.`,
      StatusCodes.CONFLICT
    );
  }

  await repo.remove(id);
};

// ── Notifikasi kasbon baru → Owner, Super Admin & Finance ─────────────
const notification = require("../notification/notification.service");

const createLoanNotify = async (body, actor = null) => {
  const loan = await createLoan(body);
  await notification.loanCreated({ employeeId: loan.employeeId, totalAmount: loan.totalAmount, createdByUserId: actor?.id ?? null });
  return loan;
};

module.exports = { getAll, getByEmployee, getById, createLoan: createLoanNotify, updateLoan, cancelLoan, addRepayment, getRepayments, getMyLoans, getMyLoanById, deleteLoan };
