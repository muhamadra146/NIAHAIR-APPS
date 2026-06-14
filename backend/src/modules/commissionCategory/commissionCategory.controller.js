const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createCommissionCategory, updateCommissionCategory, deleteCommissionCategory } = require("./commissionCategory.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Commission categories fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Commission category fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const category = await createCommissionCategory(req.body);
    return created(res, category, "Commission category created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateCommissionCategory(req.params.id, req.body);
    return success(res, result, "Commission category updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteCommissionCategory(req.params.id);
    return success(res, null, "Commission category deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, deleteController };
