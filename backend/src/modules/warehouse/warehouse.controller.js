const { success } = require("../../common/responses/apiResponse");
const {
  listWarehouses, getWarehouseById,
  syncWarehouses,
  updateWarehouseBranchMapping, removeWarehouseBranchMapping, updateWarehouseMapping,
  deleteWarehouse,
} = require("./warehouse.service");

const getAllController = async (req, res, next) => {
  try {
    return success(res, await listWarehouses(req.query), "Warehouses fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    return success(res, await getWarehouseById(req.params.id), "Warehouse fetched");
  } catch (err) { next(err); }
};

const syncController = async (req, res, next) => {
  try {
    const result = await syncWarehouses();
    return success(res, result, `Warehouse sync complete: ${result.created} created, ${result.updated} updated`);
  } catch (err) { next(err); }
};

const updateBranchMappingController = async (req, res, next) => {
  try {
    const result = await updateWarehouseBranchMapping(req.params.id, req.body);
    return success(res, result, "Warehouse branch mapping updated");
  } catch (err) { next(err); }
};

const updateMappingController = async (req, res, next) => {
  try {
    const result = await updateWarehouseMapping(req.params.id, req.body);
    return success(res, result, "Warehouse Accurate mapping updated");
  } catch (err) { next(err); }
};

const removeBranchMappingController = async (req, res, next) => {
  try {
    const result = await removeWarehouseBranchMapping(req.params.id);
    return success(res, result, "Warehouse removed from branch");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteWarehouse(req.params.id);
    return success(res, null, "Warehouse deleted");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getByIdController,
  syncController,
  updateBranchMappingController, removeBranchMappingController, updateMappingController,
  deleteController,
};
