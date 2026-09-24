const { StatusCodes } = require("http-status-codes");
const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./complaint.service");

const getStatsController = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const result = await svc.getStats({ branchId });
    return success(res, result, "Statistik komplain");
  } catch (err) { next(err); }
};

const getAllController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, branchId, status, employeeId, severity, search, startDate, endDate } = req.query;
    const result = await svc.getAll({
      page: Number(page), limit: Number(limit),
      branchId, status, employeeId, severity, search, startDate, endDate,
    });
    return success(res, result, "Komplain berhasil diambil");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Komplain berhasil diambil");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.body, req.user?.id);
    return created(res, result, "Komplain berhasil dibuat");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.updateComplaint(req.params.id, req.body, req.user?.id);
    return success(res, result, "Komplain berhasil diperbarui");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    await svc.deleteComplaint(req.params.id);
    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (err) { next(err); }
};

module.exports = { getStatsController, getAllController, getByIdController, createController, updateController, deleteController };
