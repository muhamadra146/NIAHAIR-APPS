const { success } = require("../../common/responses/apiResponse");
const { syncGlAccountsFromAccurate, getGlAccounts, updateGlAccountUsage } = require("./glAccount.sync.service");

const syncGlAccountsController = async (req, res, next) => {
  try {
    const result = await syncGlAccountsFromAccurate();
    return success(res, result, "Sinkronisasi akun GL selesai");
  } catch (err) { next(err); }
};

const getGlAccountsController = async (req, res, next) => {
  try {
    const { category, usage, page, limit } = req.query;
    const result = await getGlAccounts({ category, usage, page, limit });
    return success(res, result);
  } catch (err) { next(err); }
};

const updateUsageController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { usage } = req.body;
    const account = await updateGlAccountUsage(id, usage || null);
    return success(res, account, "Penggunaan akun GL diperbarui");
  } catch (err) { next(err); }
};

module.exports = { syncGlAccountsController, getGlAccountsController, updateUsageController };
