const { success } = require("../../common/responses/apiResponse");
const { getBySession, bulkSave, removeUsageItem } = require("./materialUsage.service");

const getBySessionController = async (req, res, next) => {
  try {
    const result = await getBySession(req.params.sessionId);
    return success(res, result, "Material usages fetched");
  } catch (err) {
    next(err);
  }
};

const bulkSaveController = async (req, res, next) => {
  try {
    const result = await bulkSave(req.params.sessionId, req.body.rows ?? []);
    return success(res, result, "Material usage saved");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await removeUsageItem(req.params.id);
    return success(res, null, "Material usage item deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getBySessionController, bulkSaveController, deleteController };
