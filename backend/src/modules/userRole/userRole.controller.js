const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createUserRole, updateUserRole, deactivateUserRole } = require("./userRole.service");

const getAllController = async (req, res, next) => {
  try {
    return success(res, await getAll(req.query), "User roles fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    return success(res, await getById(req.params.id), "User role fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    return created(res, await createUserRole(req.body), "User role created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    return success(res, await updateUserRole(req.params.id, req.body), "User role updated");
  } catch (err) { next(err); }
};

const deactivateController = async (req, res, next) => {
  try {
    return success(res, await deactivateUserRole(req.params.id), "User role deactivated");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByIdController, createController, updateController, deactivateController };
