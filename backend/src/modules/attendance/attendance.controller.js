const { success, created } = require("../../common/responses/apiResponse");
const { getDailyRoster, getAll, getById, checkIn, checkOut, manualSet } = require("./attendance.service");

const getDailyRosterController = async (req, res, next) => {
  try {
    const { branchId, date } = req.query;
    const result = await getDailyRoster(branchId, date || new Date().toISOString().split("T")[0]);
    return success(res, result, "Daily roster fetched");
  } catch (err) { next(err); }
};

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Attendance records fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Attendance record fetched");
  } catch (err) { next(err); }
};

const checkInController = async (req, res, next) => {
  try {
    const result = await checkIn(req.body);
    return created(res, result, "Checked in successfully");
  } catch (err) { next(err); }
};

const checkOutController = async (req, res, next) => {
  try {
    const result = await checkOut(req.body);
    return success(res, result, "Checked out successfully");
  } catch (err) { next(err); }
};

const manualSetController = async (req, res, next) => {
  try {
    const result = await manualSet(req.body);
    return success(res, result, "Attendance set manually");
  } catch (err) { next(err); }
};

module.exports = {
  getDailyRosterController, getAllController, getByIdController,
  checkInController, checkOutController, manualSetController,
};
