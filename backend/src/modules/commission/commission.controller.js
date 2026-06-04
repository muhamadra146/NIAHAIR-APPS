const { success } = require("../../common/responses/apiResponse");
const {
  listCommissions,
  getCommissionById,
  approveCommission,
  markCommissionPaid,
} = require("./commission.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listCommissions(req.query);
    return success(res, result, "Commissions fetched");
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

module.exports = {
  getAllController,
  getByIdController,
  approveController,
  payController,
};
