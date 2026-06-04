const { success, created } = require("../../common/responses/apiResponse");
const {
  getByItem,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} = require("./treatmentAssignment.service");

const getByItemController = async (req, res, next) => {
  try {
    const result = await getByItem(req.params.itemId);
    return success(res, result, "Assignments fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createAssignment(req.params.itemId, req.body);
    return created(res, result, "Assignment created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateAssignment(req.params.id, req.body);
    return success(res, result, "Assignment updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteAssignment(req.params.id);
    return success(res, null, "Assignment deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getByItemController,
  createController,
  updateController,
  deleteController,
};
