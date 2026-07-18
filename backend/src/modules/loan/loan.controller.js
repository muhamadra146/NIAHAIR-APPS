const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./loan.service");

const getAllController = async (req, res, next) => {
  try {
    const { employeeId, branchId, status, page = 1, limit = 20 } = req.query;
    const result = await svc.getAll({ employeeId, branchId, status, page: Number(page), limit: Number(limit) });
    return success(res, result, "Loans fetched");
  } catch (err) { next(err); }
};

const getByEmployeeController = async (req, res, next) => {
  try {
    const result = await svc.getByEmployee(req.params.employeeId);
    return success(res, result, "Loans fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Loan fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.createLoan(req.body);
    return created(res, result, "Loan created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.updateLoan(req.params.id, req.body);
    return success(res, result, "Loan updated");
  } catch (err) { next(err); }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await svc.cancelLoan(req.params.id);
    return success(res, result, "Loan cancelled");
  } catch (err) { next(err); }
};

const addRepaymentController = async (req, res, next) => {
  try {
    const result = await svc.addRepayment(req.params.id, req.body);
    return created(res, result, "Repayment recorded");
  } catch (err) { next(err); }
};

const getRepaymentsController = async (req, res, next) => {
  try {
    const result = await svc.getRepayments(req.params.id);
    return success(res, result, "Repayments fetched");
  } catch (err) { next(err); }
};

const getMyLoansController = async (req, res, next) => {
  try {
    const result = await svc.getMyLoans(req.user.employeeId);
    return success(res, result, "My loans fetched");
  } catch (err) { next(err); }
};

const getMyLoanByIdController = async (req, res, next) => {
  try {
    const result = await svc.getMyLoanById(req.params.id, req.user.employeeId);
    return success(res, result, "My loan fetched");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    await svc.deleteLoan(req.params.id);
    return success(res, null, "Loan deleted");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getByEmployeeController, getByIdController,
  createController, updateController, cancelController,
  addRepaymentController, getRepaymentsController,
  getMyLoansController, getMyLoanByIdController,
  deleteController,
};
