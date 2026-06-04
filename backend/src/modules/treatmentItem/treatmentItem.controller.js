const { success, created } = require("../../common/responses/apiResponse");
const {
  getBySession,
  createTreatmentItem,
  updateTreatmentItem,
  deleteTreatmentItem,
} = require("./treatmentItem.service");

const getBySessionController = async (req, res, next) => {
  try {
    const result = await getBySession(req.params.sessionId);
    return success(res, result, "Treatment items fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createTreatmentItem(req.params.sessionId, req.body);
    return created(res, result, "Treatment item added");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateTreatmentItem(req.params.id, req.body);
    return success(res, result, "Treatment item updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteTreatmentItem(req.params.id);
    return success(res, null, "Treatment item deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBySessionController,
  createController,
  updateController,
  deleteController,
};
