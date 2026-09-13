const { success, created } = require("../../common/responses/apiResponse");
const svc     = require("./production.service");
const syncSvc = require("./production.sync.service");

const getAllController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, branchId, warehouseId, startDate, endDate } = req.query;
    const result = await svc.getAll({
      page: Number(page), limit: Number(limit),
      status, branchId, warehouseId, startDate, endDate,
    });
    return success(res, result, "Production orders fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Production order fetched");
  } catch (err) { next(err); }
};

const getStatsController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await svc.getStats({ branchId, startDate, endDate });
    return success(res, result, "Production stats fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.body, req.user?.employeeId);
    return created(res, result, "Production order berhasil dibuat");
  } catch (err) { next(err); }
};

const updateStatusController = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await svc.updateStatus(req.params.id, status, req.user?.employeeId);
    return success(res, result, "Status production order diperbarui");
  } catch (err) { next(err); }
};

const submitQCController = async (req, res, next) => {
  try {
    const result = await svc.submitQC(req.params.id, req.body, req.user?.employeeId);
    return success(res, result, "QC berhasil disubmit");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await svc.remove(req.params.id);
    return success(res, result, "Production order berhasil dihapus");
  } catch (err) { next(err); }
};

const syncController = async (req, res, next) => {
  try {
    await syncSvc.syncProductionToAccurate(req.params.id);
    // Kembalikan data terkini termasuk field Accurate yang baru
    const order = await svc.getById(req.params.id);
    return success(res, order, "Production order berhasil disinkronkan ke Accurate");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getByIdController, getStatsController,
  createController, updateStatusController, submitQCController, deleteController,
  syncController,
};
