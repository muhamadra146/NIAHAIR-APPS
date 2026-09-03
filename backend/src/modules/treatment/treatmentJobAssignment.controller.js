const { success } = require("../../common/responses/apiResponse");
const svc = require("./treatmentJobAssignment.service");

const getController = async (req, res, next) => {
  try {
    const result = await svc.getJobAssignments(req.params.id);
    return success(res, result, "Job assignments fetched");
  } catch (err) {
    next(err);
  }
};

const upsertController = async (req, res, next) => {
  try {
    const result = await svc.upsertJobAssignments(req.params.id, req.body);
    return success(res, result, "Job assignments saved");
  } catch (err) {
    next(err);
  }
};

module.exports = { getController, upsertController };
