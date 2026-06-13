const { success, created } = require("../../common/responses/apiResponse");
const { getByEmployee, getActive, getById, createSetting, updateSetting } = require("./salary.service");

const getByEmployeeController = async (req, res, next) => {
  try {
    const result = await getByEmployee(req.params.employeeId);
    return success(res, result, "Salary settings fetched");
  } catch (err) { next(err); }
};

const getActiveController = async (req, res, next) => {
  try {
    const result = await getActive(req.params.employeeId);
    return success(res, result, "Active salary setting fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Salary setting fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await createSetting(req.body);
    return created(res, result, "Salary setting created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateSetting(req.params.id, req.body);
    return success(res, result, "Salary setting updated");
  } catch (err) { next(err); }
};

module.exports = { getByEmployeeController, getActiveController, getByIdController, createController, updateController };
