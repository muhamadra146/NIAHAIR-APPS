const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createCustomer, updateCustomer } = require("./customer.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Customers fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Customer fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const { customer, message } = await createCustomer(req.body);
    return created(res, customer, message);
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateCustomer(req.params.id, req.body);
    return success(res, result, "Customer updated");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController };
