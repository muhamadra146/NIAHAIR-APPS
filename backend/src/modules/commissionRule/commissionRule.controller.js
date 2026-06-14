const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createCommissionRule, updateCommissionRule, deleteCommissionRule } = require("./commissionRule.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Commission rules fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Commission rule fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const rule = await createCommissionRule(req.body);
    return created(res, rule, "Commission rule created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateCommissionRule(req.params.id, req.body);
    return success(res, result, "Commission rule updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteCommissionRule(req.params.id);
    return success(res, null, "Commission rule deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, deleteController };
