const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo = require("./correction.repository");

const getAll = async ({ page, limit, branchId, status, employeeId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = {};
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  if (employeeId) where.employeeId = employeeId;

  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, pageNum, limitNum) };
};

const getMy = async ({ employeeId, page, limit, status }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = { employeeId };
  if (status) where.status = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const cr = await repo.findById(id);
  if (!cr) throw new AppError("Correction request not found", StatusCodes.NOT_FOUND);
  return cr;
};

const create = async (employeeId, branchId, { staffScheduleId, attendanceId, requestedCheckIn, requestedCheckOut, reason, branchId: bodyBranchId }) => {
  const resolvedBranchId = branchId ?? bodyBranchId;
  if (!employeeId)       throw new AppError("Employee not found for this user", StatusCodes.BAD_REQUEST);
  if (!resolvedBranchId) throw new AppError("branchId is required", StatusCodes.BAD_REQUEST);
  if (!staffScheduleId)  throw new AppError("staffScheduleId is required", StatusCodes.BAD_REQUEST);
  if (!reason)           throw new AppError("reason is required", StatusCodes.BAD_REQUEST);
  if (!requestedCheckIn && !requestedCheckOut)
    throw new AppError("At least one of requestedCheckIn or requestedCheckOut is required", StatusCodes.BAD_REQUEST);

  return repo.create({
    employeeId,
    branchId: resolvedBranchId,
    staffScheduleId,
    attendanceId:       attendanceId ?? null,
    requestedCheckIn:   requestedCheckIn  ? new Date(requestedCheckIn)  : null,
    requestedCheckOut:  requestedCheckOut ? new Date(requestedCheckOut) : null,
    reason,
    status: "PENDING",
  });
};

const review = async (id, reviewerId, { status, reviewNote }) => {
  const cr = await repo.findById(id);
  if (!cr) throw new AppError("Correction request not found", StatusCodes.NOT_FOUND);
  if (cr.status !== "PENDING") throw new AppError("Only PENDING requests can be reviewed", StatusCodes.BAD_REQUEST);
  if (!["APPROVED", "REJECTED"].includes(status))
    throw new AppError("status must be APPROVED or REJECTED", StatusCodes.BAD_REQUEST);

  return repo.update(id, { status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: reviewNote ?? null });
};

module.exports = { getAll, getMy, getById, create, review };
