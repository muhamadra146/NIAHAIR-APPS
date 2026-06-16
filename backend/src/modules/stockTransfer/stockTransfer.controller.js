const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./stockTransfer.service");

const getAllController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sourceWarehouseId, destinationWarehouseId, status, branchId } = req.query;
    const result = await svc.getAll({
      page: Number(page), limit: Number(limit),
      sourceWarehouseId, destinationWarehouseId, status, branchId,
    });
    return success(res, result, "Stock transfers fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Stock transfer fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.body, req.user?.id);
    return created(res, result, "Transfer stok berhasil dibuat");
  } catch (err) { next(err); }
};

const updateStatusController = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await svc.updateStatus(req.params.id, status);
    return success(res, result, "Status transfer diperbarui");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByIdController, createController, updateStatusController };
