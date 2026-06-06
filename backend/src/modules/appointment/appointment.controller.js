const { success, created } = require("../../common/responses/apiResponse");
const {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentById,
  changeAppointmentStatus,
} = require("./appointment.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listAppointments(req.query);
    return success(res, result, "Appointments fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getAppointmentById(req.params.id);
    return success(res, result, "Appointment fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createAppointment(
      { ...req.body, branchId: req.branchId },
      req.user.id,
      req.user.employeeId ?? null
    );
    return created(res, result, "Appointment created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateAppointmentById(req.params.id, req.body, req.user.id);
    return success(res, result, "Appointment updated");
  } catch (err) {
    next(err);
  }
};

const changeStatusController = async (req, res, next) => {
  try {
    const result = await changeAppointmentStatus(req.params.id, req.body, req.user.id);
    return success(res, result, "Appointment status updated");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllController,
  getByIdController,
  createController,
  updateController,
  changeStatusController,
};
