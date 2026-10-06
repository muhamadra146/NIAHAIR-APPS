const { success } = require("../../common/responses/apiResponse");
const {
  listCommissions,
  listMyCommissions,
  getMyCommissionSummary,
  getCommissionById,
  approveCommission,
  markCommissionPaid,
  regenerateCommission,
  overrideCommission,
  deleteCommission,
} = require("./commission.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listCommissions(req.query);
    return success(res, result, "Commissions fetched");
  } catch (err) {
    next(err);
  }
};

const getMyController = async (req, res, next) => {
  try {
    const result = await listMyCommissions(req.user.employeeId, req.query);
    return success(res, result, "My commissions fetched");
  } catch (err) {
    next(err);
  }
};

// Ringkasan Komisi Saya per periode gaji (?yearMonth=YYYY-MM = bulan gajian)
const getMySummaryController = async (req, res, next) => {
  try {
    const result = await getMyCommissionSummary(req.user.employeeId, req.query);
    return success(res, result, "My commission summary fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getCommissionById(req.params.id);
    return success(res, result, "Commission fetched");
  } catch (err) {
    next(err);
  }
};

const approveController = async (req, res, next) => {
  try {
    const result = await approveCommission(req.params.id, req.user.id);
    return success(res, result, "Commission approved");
  } catch (err) {
    next(err);
  }
};

const payController = async (req, res, next) => {
  try {
    const result = await markCommissionPaid(req.params.id, req.user.id);
    return success(res, result, "Commission marked as paid");
  } catch (err) {
    next(err);
  }
};

const regenerateController = async (req, res, next) => {
  try {
    const result = await regenerateCommission(req.params.invoiceId);
    return success(res, result, "Commissions regenerated");
  } catch (err) {
    next(err);
  }
};

const overrideController = async (req, res, next) => {
  try {
    const { commissionAmount, notes } = req.body;
    const result = await overrideCommission(req.params.id, {
      commissionAmount,
      userId: req.user.id,
      notes,
    });
    return success(res, result, "Commission overridden");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deleteCommission(req.params.id, req.user.roleCode);
    return success(res, result, "Komisi dihapus");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllController,
  getMyController,
  getMySummaryController,
  getByIdController,
  approveController,
  payController,
  regenerateController,
  overrideController,
  deleteController,
};
