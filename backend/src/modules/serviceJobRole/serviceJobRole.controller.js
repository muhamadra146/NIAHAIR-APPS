const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./serviceJobRole.service");

const listController = async (req, res, next) => {
  try {
    const result = await svc.listJobRoles(req.params.itemId, { all: req.query.all });
    return success(res, result, "Job roles fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.createJobRole(req.params.itemId, req.body);
    return created(res, result, "Job role created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.updateJobRole(req.params.itemId, req.params.id, req.body);
    return success(res, result, "Job role updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await svc.deleteJobRole(req.params.itemId, req.params.id);
    return success(res, result, "Job role deactivated");
  } catch (err) {
    next(err);
  }
};

module.exports = { listController, createController, updateController, deleteController };
