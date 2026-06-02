const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createEmployeeRole, updateEmployeeRole } = require("./employeeRole.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Employee roles fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Employee role fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const role = await createEmployeeRole(req.body);
    return created(res, role, "Employee role created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateEmployeeRole(req.params.id, req.body);
    return success(res, result, "Employee role updated");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController };
