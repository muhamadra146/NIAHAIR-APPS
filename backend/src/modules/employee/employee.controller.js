const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, getNextCode, createEmployee, updateEmployee, updateEmployeeBranches, deleteEmployee } = require("./employee.service");

const getNextCodeController = async (req, res, next) => {
  try {
    const code = await getNextCode();
    return success(res, { code }, "Next employee code generated");
  } catch (err) {
    next(err);
  }
};

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Employees fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Employee fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const employee = await createEmployee(req.body);
    return created(res, employee, "Employee created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateEmployee(req.params.id, req.body);
    return success(res, result, "Employee updated");
  } catch (err) {
    next(err);
  }
};

const updateBranchesController = async (req, res, next) => {
  try {
    const result = await updateEmployeeBranches(req.params.id, req.body.branchIds);
    return success(res, result, "Employee branches updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteEmployee(req.params.id);
    return success(res, null, "Employee deactivated");
  } catch (err) {
    next(err);
  }
};

module.exports = { getNextCodeController, getAllController, getByIdController, createController, updateController, updateBranchesController, deleteController };
