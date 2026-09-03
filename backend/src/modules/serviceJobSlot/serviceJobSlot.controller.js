const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./serviceJobSlot.service");

const listController = async (req, res, next) => {
  try {
    const result = await svc.listJobSlots(req.params.itemId, { all: req.query.all });
    return success(res, result, "Job slots fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.createJobSlot(req.params.itemId, req.body);
    return created(res, result, "Job slot created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.updateJobSlot(req.params.itemId, req.params.id, req.body);
    return success(res, result, "Job slot updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await svc.deleteJobSlot(req.params.itemId, req.params.id);
    return success(res, result, "Job slot deactivated");
  } catch (err) {
    next(err);
  }
};

module.exports = { listController, createController, updateController, deleteController };
