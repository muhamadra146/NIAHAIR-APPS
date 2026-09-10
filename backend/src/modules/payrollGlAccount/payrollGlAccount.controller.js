const { success } = require("../../common/responses/apiResponse");
const { getPayrollGlAccounts, savePayrollGlAccounts } = require("./payrollGlAccount.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await getPayrollGlAccounts();
    return success(res, result, "Payroll GL accounts fetched");
  } catch (err) {
    next(err);
  }
};

const saveController = async (req, res, next) => {
  try {
    const result = await savePayrollGlAccounts(req.body.mappings ?? []);
    return success(res, result, "Payroll GL accounts saved");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, saveController };
