const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createBranch, updateBranch, deleteBranch } = require("./branch.service");
const { syncBranchesFromAccurate, mapBranchToAccurate } = require("./branchAccurate.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Branches fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Branch fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const branch = await createBranch(req.body);
    return created(res, branch, "Branch created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateBranch(req.params.id, req.body);
    return success(res, result, "Branch updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteBranch(req.params.id);
    return success(res, null, "Branch deactivated");
  } catch (err) {
    next(err);
  }
};

const syncFromAccurateController = async (req, res, next) => {
  try {
    const result = await syncBranchesFromAccurate();
    return success(res, result, "Branch sync from Accurate complete");
  } catch (err) {
    next(err);
  }
};

const mapToAccurateController = async (req, res, next) => {
  try {
    const result = await mapBranchToAccurate(req.params.id, Number(req.body.accurateBranchId));
    return success(res, result, "Branch mapped to Accurate");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllController,
  getByIdController,
  createController,
  updateController,
  deleteController,
  syncFromAccurateController,
  mapToAccurateController,
};
