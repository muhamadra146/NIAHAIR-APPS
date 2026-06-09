const { success, created } = require("../../common/responses/apiResponse");
const {
  listDeposits,
  getDepositById,
  createDeposit,
  refundDeposit,
  cancelDeposit,
  linkAppointmentToDeposit,
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
    // Route param wins over body for appointmentId (nested route pattern)
    const result = await createDeposit({
      ...req.body,
      appointmentId:       req.params.appointmentId ?? req.body.appointmentId ?? null,
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

const linkAppointmentController = async (req, res, next) => {
  try {
    const result = await linkAppointmentToDeposit(req.params.id, req.body.appointmentId);
    return success(res, result, "Appointment linked to deposit");
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
  linkAppointmentController,
};
