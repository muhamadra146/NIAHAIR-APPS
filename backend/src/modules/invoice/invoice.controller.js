const { success, created } = require("../../common/responses/apiResponse");
const {
  listInvoices,
  getInvoiceById,
  createInvoice,
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
    const result = await createInvoice(req.body, req.user.id);
    return created(res, result, "Invoice created");
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

module.exports = { getAllController, getByIdController, createController, cancelController };
