const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createItem, updateItem, getServiceMaterials } = require("./item.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Items fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Item fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const { item, message } = await createItem(req.body);
    return created(res, item, message);
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateItem(req.params.id, req.body);
    return success(res, result, "Item updated");
  } catch (err) {
    next(err);
  }
};

const getServiceMaterialsController = async (req, res, next) => {
  try {
    const result = await getServiceMaterials(req.params.id);
    return success(res, result, "Service materials fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, getServiceMaterialsController };
