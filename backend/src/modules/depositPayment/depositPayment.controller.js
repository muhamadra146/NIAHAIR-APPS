const { success, created } = require("../../common/responses/apiResponse");
const {
  listDepositPayments,
  getDepositPaymentById,
  getPaymentsByDeposit,
  createDepositPayment,
  deleteDepositPayment,
} = require("./depositPayment.service");

const getAllController = async (req, res, next) => {
  try {
    const depositId = req.params.depositId ?? req.query.depositId;
    const result = await listDepositPayments({ ...req.query, depositId });
    return success(res, result, "Deposit payments fetched");
  } catch (err) {
    next(err);
  }
};

const getByDepositController = async (req, res, next) => {
  try {
    const result = await getPaymentsByDeposit(req.params.depositId);
    return success(res, result, "Deposit payments fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getDepositPaymentById(req.params.id);
    return success(res, result, "Deposit payment fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createDepositPayment({
      depositId:             req.params.depositId,
      ...req.body,
      transferProofUrl:      req.file?.path     ?? null,
      transferProofPublicId: req.file?.filename ?? null,
    });
    return created(res, result, "Deposit payment created");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deleteDepositPayment(req.params.id);
    return success(res, result, "Deposit payment deleted");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByDepositController, getByIdController, createController, deleteController };
