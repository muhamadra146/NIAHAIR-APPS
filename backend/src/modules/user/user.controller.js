const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createUser, updateUser, resetPassword, deactivateUser } = require("./user.service");

const getAllController = async (req, res, next) => {
  try {
    return success(res, await getAll(req.query), "Users fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    // Security: SUPER_ADMIN can view anyone; others only themselves
    return success(
      res,
      await getById(req.params.id, req.user.id, req.user.roleCode),
      "User fetched"
    );
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    return created(res, await createUser(req.body), "User created");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    return success(res, await updateUser(req.params.id, req.body), "User updated");
  } catch (err) { next(err); }
};

const resetPasswordController = async (req, res, next) => {
  try {
    return success(res, await resetPassword(req.params.id, req.body), "Password updated");
  } catch (err) { next(err); }
};

const deactivateController = async (req, res, next) => {
  try {
    return success(res, await deactivateUser(req.params.id), "User deactivated");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getByIdController, createController,
  updateController, resetPasswordController, deactivateController,
};
