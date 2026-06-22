const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./payroll.service");

const getAllController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employeeId, branchId, status, yearMonth } = req.query;
    const result = await svc.getAll({ page: Number(page), limit: Number(limit), employeeId, branchId, status, yearMonth });
    return success(res, result, "Payrolls fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Payroll fetched");
  } catch (err) { next(err); }
};

const generateController = async (req, res, next) => {
  try {
    const result = await svc.generate(req.body, req.user.id);
    return created(res, result, "Payroll generated");
  } catch (err) { next(err); }
};

const bulkGenerateController = async (req, res, next) => {
  try {
    const result = await svc.bulkGenerate(req.body, req.user.id);
    return created(res, result, "Bulk payroll generated");
  } catch (err) { next(err); }
};

const recalculateController = async (req, res, next) => {
  try {
    const result = await svc.recalculate(req.params.id, req.user.id);
    return success(res, result, "Payroll recalculated");
  } catch (err) { next(err); }
};

const submitController = async (req, res, next) => {
  try {
    const result = await svc.submitForApproval(req.params.id, req.user.id);
    return success(res, result, "Payroll submitted for approval");
  } catch (err) { next(err); }
};

const approveController = async (req, res, next) => {
  try {
    const result = await svc.approve(req.params.id, req.user.id);
    return success(res, result, "Payroll approved");
  } catch (err) { next(err); }
};

const markAsPaidController = async (req, res, next) => {
  try {
    const result = await svc.markAsPaid(req.params.id, req.user.id);
    return success(res, result, "Payroll marked as paid");
  } catch (err) { next(err); }
};

const updateNotesController = async (req, res, next) => {
  try {
    const result = await svc.updateNotes(req.params.id, req.body.notes);
    return success(res, result, "Notes updated");
  } catch (err) { next(err); }
};

const getMyController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await svc.getMy({ employeeId: req.user.employeeId, page: Number(page), limit: Number(limit) });
    return success(res, result, "My payrolls fetched");
  } catch (err) { next(err); }
};

const getBpjsReportController = async (req, res, next) => {
  try {
    const result = await svc.getBpjsReport(req.query);
    return success(res, result, "BPJS report fetched");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await svc.deletePayroll(req.params.id);
    return success(res, result, "Payroll dihapus");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getByIdController, generateController, bulkGenerateController,
  recalculateController, submitController, approveController, markAsPaidController,
  updateNotesController, getMyController, getBpjsReportController, deleteController,
};
