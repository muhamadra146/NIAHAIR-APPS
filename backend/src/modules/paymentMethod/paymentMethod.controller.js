const { success, created } = require("../../common/responses/apiResponse");
const {
  listPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} = require("./paymentMethod.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listPaymentMethods(req.query);
    return success(res, result, "Payment methods fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getPaymentMethodById(req.params.id);
    return success(res, result, "Payment method fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createPaymentMethod(req.body);
    return created(res, result, "Payment method created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updatePaymentMethod(req.params.id, req.body);
    return success(res, result, "Payment method updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deletePaymentMethod(req.params.id);
    return success(res, result, "Payment method deactivated");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, deleteController };
