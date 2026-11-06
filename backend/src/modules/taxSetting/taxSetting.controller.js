const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./taxSetting.service");

const getAllController = async (req, res, next) => {
  try {
    return success(res, await svc.getAll(), "Tax settings fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    return created(res, await svc.create(req.body), "Tax setting created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    return success(res, await svc.update(req.params.id, req.body), "Tax setting updated");
  } catch (err) { next(err); }
};

module.exports = { getAllController, createController, updateController };
