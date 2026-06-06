const { success, created } = require("../../common/responses/apiResponse");
const {
  listDeposits,
  getDepositById,
  createDeposit,
  refundDeposit,
  cancelDeposit,
} = require("./deposit.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listDeposits(req.query);
    return success(res, result, "Deposits fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getDepositById(req.params.id);
    return success(res, result, "Deposit fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    // appointmentId comes from the parent route param
    // (mergeParams: true ensures it is available here)
    const result = await createDeposit({
      appointmentId:      req.params.appointmentId,
      ...req.body,
      branchId:            req.branchId,
      createdByEmployeeId: req.user.employeeId ?? null,
    });
    return created(res, result, "Deposit created");
  } catch (err) {
    next(err);
  }
};

const refundController = async (req, res, next) => {
  try {
    const result = await refundDeposit(req.params.id);
    return success(res, result, "Deposit refunded");
  } catch (err) {
    next(err);
  }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await cancelDeposit(req.params.id);
    return success(res, result, "Deposit cancelled");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllController,
  getByIdController,
  createController,
  refundController,
  cancelController,
};
