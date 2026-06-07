const { success, created } = require("../../common/responses/apiResponse");
const {
  listCashAccounts,
  getCashAccountById,
  createCashAccount,
  updateCashAccount,
  deleteCashAccount,
} = require("./cashAccount.service");
const { syncCashAccountsFromAccurate } = require("./cashAccount.sync.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listCashAccounts(req.query);
    return success(res, result, "Cash accounts fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getCashAccountById(req.params.id);
    return success(res, result, "Cash account fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createCashAccount(req.body);
    return created(res, result, "Cash account created");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateCashAccount(req.params.id, req.body);
    return success(res, result, "Cash account updated");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deleteCashAccount(req.params.id);
    return success(res, result, "Cash account deactivated");
  } catch (err) {
    next(err);
  }
};

const syncController = async (req, res, next) => {
  try {
    const result = await syncCashAccountsFromAccurate();
    return success(res, result, "Cash accounts synced from Accurate");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, deleteController, syncController };
