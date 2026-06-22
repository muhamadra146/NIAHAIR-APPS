const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./holiday.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await svc.getAll({ year: req.query.year });
    return success(res, result, "Holidays fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Holiday fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.body);
    return created(res, result, "Holiday created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.update(req.params.id, req.body);
    return success(res, result, "Holiday updated");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await svc.remove(req.params.id);
    return success(res, result, "Holiday deleted");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByIdController, createController, updateController, deleteController };
