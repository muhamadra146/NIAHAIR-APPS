const { success } = require("../../common/responses/apiResponse");
const { getByKey, upsertSetting } = require("./setting.service");

const getByKeyController = async (req, res, next) => {
  try {
    const setting = await getByKey(req.params.key);
    return success(res, setting);
  } catch (err) {
    next(err);
  }
};

const upsertController = async (req, res, next) => {
  try {
    const setting = await upsertSetting(req.params.key, req.body);
    return success(res, setting, "Setting updated");
  } catch (err) {
    next(err);
  }
};

module.exports = { getByKeyController, upsertController };
