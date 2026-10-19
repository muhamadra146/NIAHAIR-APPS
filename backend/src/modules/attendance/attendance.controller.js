const { success, created } = require("../../common/responses/apiResponse");
const { wibDateStr }       = require("../../utils/date");
const { getDailyRoster, getAll, getById, checkIn, checkOut, manualSet, getMyToday, getMy, getReport, getPresentEmployees } = require("./attendance.service");

const getDailyRosterController = async (req, res, next) => {
  try {
    const { branchId, date } = req.query;
    const result = await getDailyRoster(branchId, date || wibDateStr(), req.user);
    return success(res, result, "Daily roster fetched");
  } catch (err) { next(err); }
};

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query, req.user);
    return success(res, result, "Attendance records fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id, req.user);
    return success(res, result, "Attendance record fetched");
  } catch (err) { next(err); }
};

const checkInController = async (req, res, next) => {
  try {
    const result = await checkIn(req.body, req.user);
    return created(res, result, "Checked in successfully");
  } catch (err) { next(err); }
};

const checkOutController = async (req, res, next) => {
  try {
    const result = await checkOut(req.body, req.user);
    return success(res, result, "Checked out successfully");
  } catch (err) { next(err); }
};

const manualSetController = async (req, res, next) => {
  try {
    const result = await manualSet(req.body, req.user);
    return success(res, result, "Attendance set manually");
  } catch (err) { next(err); }
};

const getMyTodayController = async (req, res, next) => {
  try {
    const result = await getMyToday(req.user.employeeId);
    return success(res, result, "Today schedule fetched");
  } catch (err) { next(err); }
};

const getMyController = async (req, res, next) => {
  try {
    const result = await getMy({ employeeId: req.user.employeeId, ...req.query });
    return success(res, result, "My attendance fetched");
  } catch (err) { next(err); }
};

const getPresentController = async (req, res, next) => {
  try {
    const result = await getPresentEmployees(req.query);
    return success(res, result, "Karyawan hadir");
  } catch (err) { next(err); }
};

const getReportController = async (req, res, next) => {
  try {
    const result = await getReport(req.query, req.user);
    return success(res, result, "Attendance report fetched");
  } catch (err) { next(err); }
};

module.exports = {
  getDailyRosterController, getAllController, getByIdController,
  checkInController, checkOutController, manualSetController,
  getMyTodayController, getMyController, getReportController, getPresentController,
};
