const { success } = require("../../common/responses/apiResponse");
const svc = require("./itemCategory.service");

const getAllController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const result = await svc.getAll({ page: Number(page), limit: Number(limit), search });
    return success(res, result, "Item categories fetched");
  } catch (err) { next(err); }
};

const syncController = async (req, res, next) => {
  try {
    const result = await svc.syncFromAccurate();
    return success(res, result, "Item categories synced from Accurate");
  } catch (err) { next(err); }
};

module.exports = { getAllController, syncController };
