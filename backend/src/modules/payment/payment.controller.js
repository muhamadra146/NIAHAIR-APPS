const { success, created } = require("../../common/responses/apiResponse");
const { listPayments, getPaymentById, createPayment } = require("./payment.service");

const getAllController = async (req, res, next) => {
  try {
    // invoiceId from nested route param (mergeParams) takes precedence over query string
    const invoiceId = req.params.invoiceId ?? req.query.invoiceId;
    const result = await listPayments({ ...req.query, invoiceId });
    return success(res, result, "Payments fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getPaymentById(req.params.id);
    return success(res, result, "Payment fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const invoiceId = req.params.invoiceId;
    const result = await createPayment({ invoiceId, ...req.body }, req.user.id);
    return created(res, result, "Payment created");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController };
