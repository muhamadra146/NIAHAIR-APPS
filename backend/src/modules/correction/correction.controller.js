const { success, created } = require("../../common/responses/apiResponse");
const prisma = require("../../config/prisma");
const svc = require("./correction.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await svc.getAll(req.query);
    return success(res, result, "Correction requests fetched");
  } catch (err) { next(err); }
};

const getMyController = async (req, res, next) => {
  try {
    const result = await svc.getMy({ ...req.query, employeeId: req.user.employeeId });
    return success(res, result, "My correction requests fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Correction request fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { homeBranchId: true } });
    const result = await svc.create(employeeId, emp?.homeBranchId ?? null, req.body);
    return created(res, result, "Correction request submitted");
  } catch (err) { next(err); }
};

const reviewController = async (req, res, next) => {
  try {
    const result = await svc.review(req.params.id, req.user.id, req.body);
    return success(res, result, "Correction request reviewed");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getMyController, getByIdController, createController, reviewController };
