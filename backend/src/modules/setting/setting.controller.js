const { StatusCodes } = require("http-status-codes");
const { success } = require("../../common/responses/apiResponse");
const repo = require("./setting.repository");

const getByKeyController = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await repo.findByKey(key);
    success(res, setting ?? { key, value: null });
  } catch (err) {
    next(err);
  }
};

const upsertController = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const setting = await repo.upsert(key, String(value), description);
    success(res, setting, "Setting updated", StatusCodes.OK);
  } catch (err) {
    next(err);
  }
};

module.exports = { getByKeyController, upsertController };
