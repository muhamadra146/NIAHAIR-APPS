const { StatusCodes } = require("http-status-codes");
const { success } = require("../../common/responses/apiResponse");
const svc = require("./commissionJob.service");

const list = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const data = await svc.listJobs(categoryId, { all: req.query.all });
    return success(res, data);
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const data = await svc.createJob(categoryId, req.body);
    return success(res, data, "Job berhasil dibuat", StatusCodes.CREATED);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const { categoryId, id } = req.params;
    const data = await svc.updateJob(categoryId, id, req.body);
    return success(res, data);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const { categoryId, id } = req.params;
    await svc.deleteJob(categoryId, id);
    return success(res, { deleted: true });
  } catch (e) { next(e); }
};

module.exports = { list, create, update, remove };
