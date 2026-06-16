const { success, created } = require("../../common/responses/apiResponse");
const { getRoster, bulkUpsert, getAvailableStaff, getMySchedules } = require("./staffSchedule.service");

const getRosterController = async (req, res, next) => {
  try {
    const result = await getRoster(req.query);
    return success(res, result, "Roster fetched");
  } catch (err) { next(err); }
};

const bulkUpsertController = async (req, res, next) => {
  try {
    const result = await bulkUpsert(req.body);
    return success(res, result, "Schedules updated");
  } catch (err) { next(err); }
};

const getAvailableStaffController = async (req, res, next) => {
  try {
    const result = await getAvailableStaff(req.query);
    return success(res, result, "Available staff fetched");
  } catch (err) { next(err); }
};

const getMySchedulesController = async (req, res, next) => {
  try {
    const result = await getMySchedules(req.user.employeeId, req.query);
    return success(res, result, "My schedules fetched");
  } catch (err) { next(err); }
};

module.exports = { getRosterController, bulkUpsertController, getAvailableStaffController, getMySchedulesController };
