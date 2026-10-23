const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./leave.service");

const getAllController = async (req, res, next) => {
  try {
    const { employeeId, status, branchId, page = 1, limit = 20 } = req.query;
    const result = await svc.getAll({ employeeId, status, branchId, page: Number(page), limit: Number(limit) }, req.accessScope);
    return success(res, result, "Leaves fetched");
  } catch (err) { next(err); }
};

const getMyController = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await svc.getMy({ employeeId: req.user.employeeId, status, page: Number(page), limit: Number(limit) });
    return success(res, result, "My leaves fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id, req.user);
    return success(res, result, "Leave fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.createLeave(req.user.employeeId, req.body);
    return created(res, result, "Leave request submitted");
  } catch (err) { next(err); }
};

const approveController = async (req, res, next) => {
  try {
    const result = await svc.approve(req.params.id, req.user.id, req.user);
    return success(res, result, "Leave approved");
  } catch (err) { next(err); }
};

const rejectController = async (req, res, next) => {
  try {
    const result = await svc.reject(req.params.id, req.user.id, req.user);
    return success(res, result, "Leave rejected");
  } catch (err) { next(err); }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await svc.cancel(req.params.id, req.user.employeeId);
    return success(res, result, "Leave cancelled");
  } catch (err) { next(err); }
};

const workingDaysController = async (req, res, next) => {
  try {
    const result = await svc.previewWorkingDays(req.user.employeeId, req.query);
    return success(res, result, "Hari kerja cuti dihitung");
  } catch (err) { next(err); }
};

const cancelApprovedController = async (req, res, next) => {
  try {
    const result = await svc.cancelApproved(req.params.id, req.user);
    return success(res, result, "Cuti dibatalkan");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
  workingDaysController, cancelApprovedController,
};
