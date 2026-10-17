const { success, created } = require("../../common/responses/apiResponse");
const {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentById,
  changeAppointmentStatus,
  rescheduleAppointment,
  updateRescheduleById,
  deleteAppointmentById,
} = require("./appointment.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listAppointments(req.query);
    return success(res, result, "Daftar booking berhasil dimuat");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getAppointmentById(req.params.id);
    return success(res, result, "Booking berhasil dimuat");
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
    return created(res, result, "Booking berhasil dibuat");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateAppointmentById(req.params.id, req.body, req.user.id);
    return success(res, result, "Booking berhasil diperbarui");
  } catch (err) {
    next(err);
  }
};

const changeStatusController = async (req, res, next) => {
  try {
    const result = await changeAppointmentStatus(req.params.id, req.body, req.user.id);
    return success(res, result, "Status booking berhasil diperbarui");
  } catch (err) {
    next(err);
  }
};

const rescheduleController = async (req, res, next) => {
  try {
    const result = await rescheduleAppointment(req.params.id, req.body, req.user.id);
    return success(res, result, "Booking berhasil di-reschedule");
  } catch (err) {
    next(err);
  }
};

const updateRescheduleController = async (req, res, next) => {
  try {
    const result = await updateRescheduleById(req.params.id, req.params.historyId, req.body);
    return success(res, result, "Reschedule berhasil diperbarui");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteAppointmentById(req.params.id);
    return success(res, null, "Booking berhasil dihapus");
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
  rescheduleController,
  updateRescheduleController,
  deleteController,
};
