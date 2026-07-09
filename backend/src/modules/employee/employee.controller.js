const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, getNextCode, createEmployee, updateEmployee, uploadEmployeeFiles, updateEmployeeBranches, deactivateEmployee, deleteEmployee } = require("./employee.service");

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
    const files = req.files ?? {};
    const body  = {
      ...req.body,
      ...(files.ktpFile?.[0]      && { ktpFileUrl: files.ktpFile[0].path, ktpFilePublicId: files.ktpFile[0].filename }),
      ...(files.contractFile?.[0] && { contractFileUrl: files.contractFile[0].path, contractFilePublicId: files.contractFile[0].filename }),
    };
    const employee = await createEmployee(body);
    return created(res, employee, "Employee created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const files = req.files ?? {};
    const body  = {
      ...req.body,
      ...(files.ktpFile?.[0]      && { ktpFileUrl: files.ktpFile[0].path, ktpFilePublicId: files.ktpFile[0].filename }),
      ...(files.contractFile?.[0] && { contractFileUrl: files.contractFile[0].path, contractFilePublicId: files.contractFile[0].filename }),
    };
    const result = await updateEmployee(req.params.id, body);
    return success(res, result, "Employee updated");
  } catch (err) {
    next(err);
  }
};

const uploadFilesController = async (req, res, next) => {
  try {
    const files = req.files ?? {};
    const data = {
      ...(files.ktpFile?.[0]      && { ktpFileUrl: files.ktpFile[0].path, ktpFilePublicId: files.ktpFile[0].filename }),
      ...(files.contractFile?.[0] && { contractFileUrl: files.contractFile[0].path, contractFilePublicId: files.contractFile[0].filename }),
    };
    const result = await uploadEmployeeFiles(req.params.id, data);
    return success(res, result, "Files uploaded");
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

const deactivateController = async (req, res, next) => {
  try {
    const result = await deactivateEmployee(req.params.id);
    return success(res, result, "Employee deactivated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteEmployee(req.params.id);
    return success(res, null, "Employee deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getNextCodeController, getAllController, getByIdController, createController, updateController, uploadFilesController, updateBranchesController, deactivateController, deleteController };
