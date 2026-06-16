const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./membership.service");

const getAllController = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await svc.getAll({ page: Number(page), limit: Number(limit) });
    return success(res, result, "Memberships fetched");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await svc.getById(req.params.id);
    return success(res, result, "Membership fetched");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const result = await svc.create(req.body);
    return created(res, result, "Membership berhasil dibuat");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const result = await svc.update(req.params.id, req.body);
    return success(res, result, "Membership berhasil diperbarui");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    await svc.remove(req.params.id);
    return success(res, null, "Membership berhasil dihapus");
  } catch (err) { next(err); }
};

const getCustomerMembershipController = async (req, res, next) => {
  try {
    const result = await svc.getCustomerMembership(req.params.customerId);
    return success(res, result, "Customer membership fetched");
  } catch (err) { next(err); }
};

const assignMembershipController = async (req, res, next) => {
  try {
    const { membershipId } = req.body;
    const result = await svc.assignMembership(req.params.customerId, membershipId, req.user?.id);
    return created(res, result, "Membership berhasil ditetapkan ke pelanggan");
  } catch (err) { next(err); }
};

const cancelMembershipController = async (req, res, next) => {
  try {
    const result = await svc.cancelMembership(req.params.customerId);
    return success(res, result, "Membership pelanggan berhasil dibatalkan");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController, getByIdController, createController, updateController, deleteController,
  getCustomerMembershipController, assignMembershipController, cancelMembershipController,
};
