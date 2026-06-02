const { success } = require("../../common/responses/apiResponse");
const { getAll, getById } = require("./unit.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Units fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Unit fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController };
