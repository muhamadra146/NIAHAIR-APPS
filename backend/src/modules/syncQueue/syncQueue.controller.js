const { success, created } = require("../../common/responses/apiResponse");
const { listSyncQueues, createSyncJob, retrySync } = require("./syncQueue.service");

const getAllController = async (req, res, next) => {
  try {
    return success(res, await listSyncQueues(req.query), "Sync queues fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await createSyncJob(req.body);
    const message = result.created ? "Sync job created" : "Sync job already pending";
    return result.created
      ? created(res, result.job, message)
      : success(res, result.job, message);
  } catch (err) { next(err); }
};

const retryController = async (req, res, next) => {
  try {
    return success(res, await retrySync(req.params.id), "Sync job queued for retry");
  } catch (err) { next(err); }
};

module.exports = { getAllController, createController, retryController };
