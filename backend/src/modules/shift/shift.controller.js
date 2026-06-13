const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createShift, updateShift } = require("./shift.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Shifts fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Shift fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await createShift(req.body);
    return created(res, result, "Shift created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateShift(req.params.id, req.body);
    return success(res, result, "Shift updated");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByIdController, createController, updateController };
