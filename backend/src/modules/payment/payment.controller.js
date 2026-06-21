const { success, created } = require("../../common/responses/apiResponse");
const { listPayments, getPaymentById, createPayment, deletePayment, getPaymentSummary } = require("./payment.service");

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
    const result = await createPayment({
      invoiceId:           req.params.invoiceId,
      ...req.body,
      branchId:            req.branchId,
      createdByEmployeeId: req.user.employeeId ?? null,
    }, req.user.id);
    return created(res, result, "Payment created");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deletePayment(req.params.id, req.user.id);
    return success(res, result, "Payment deleted");
  } catch (err) {
    next(err);
  }
};

const summaryController = async (req, res, next) => {
  try {
    const result = await getPaymentSummary(req.query);
    return success(res, result, "Payment summary fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, deleteController, summaryController };
