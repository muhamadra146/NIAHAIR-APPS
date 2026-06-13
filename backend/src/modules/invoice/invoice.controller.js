const { success, created } = require("../../common/responses/apiResponse");
const {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  applyDepositToInvoice,
  cancelInvoice,
} = require("./invoice.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listInvoices(req.query);
    return success(res, result, "Invoices fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getInvoiceById(req.params.id);
    return success(res, result, "Invoice fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createInvoice(req.body, req.user.id, req.branchId, req.user.employeeId ?? null);
    return created(res, result, "Invoice created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateInvoice(req.params.id, req.body, req.user.id);
    return success(res, result, "Invoice updated");
  } catch (err) {
    next(err);
  }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await cancelInvoice(req.params.id, req.user.id);
    return success(res, result, "Invoice cancelled");
  } catch (err) {
    next(err);
  }
};

const applyDepositController = async (req, res, next) => {
  try {
    const result = await applyDepositToInvoice(req.params.invoiceId, req.body, req.user.id);
    return success(res, result, "Deposit applied to invoice");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, applyDepositController, cancelController };
