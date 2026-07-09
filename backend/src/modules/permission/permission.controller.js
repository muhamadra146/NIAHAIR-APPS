const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./permission.service");

const getAllController = async (req, res, next) => {
  try {
    const { employeeId, branchId, status, page = 1, limit = 20 } = req.query;
    const result = await svc.getAll({ employeeId, branchId, status, page: Number(page), limit: Number(limit) });
    return success(res, result, "Permission requests fetched");
  } catch (err) { next(err); }
};

const getMyController = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await svc.getMy({ employeeId: req.user.employeeId, status, page: Number(page), limit: Number(limit) });
    return success(res, result, "My permission requests fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Permission request fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.user.employeeId, req.branchId ?? null, req.body);
    return created(res, result, "Izin berhasil diajukan");
  } catch (err) { next(err); }
};

const approveController = async (req, res, next) => {
  try {
    const { reviewNote } = req.body;
    const result = await svc.approve(req.params.id, req.user.id, reviewNote);
    return success(res, result, "Izin disetujui");
  } catch (err) { next(err); }
};

const rejectController = async (req, res, next) => {
  try {
    const { reviewNote } = req.body;
    const result = await svc.reject(req.params.id, req.user.id, reviewNote);
    return success(res, result, "Izin ditolak");
  } catch (err) { next(err); }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await svc.cancel(req.params.id, req.user.employeeId);
    return success(res, result, "Izin dibatalkan");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
};
