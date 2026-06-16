const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./leaveType.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await svc.getAll(req.query.includeInactive === "true");
    return success(res, result, "Leave types fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Leave type fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.body);
    return created(res, result, "Leave type created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.update(req.params.id, req.body);
    return success(res, result, "Leave type updated");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByIdController, createController, updateController };
