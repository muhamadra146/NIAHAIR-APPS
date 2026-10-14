const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./division.service");

const getAllController = async (req, res, next) => {
  try {
    return success(res, await svc.getAll(req.query), "Divisi berhasil dimuat");
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    return success(res, await svc.getById(req.params.id), "Divisi berhasil dimuat");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    return created(res, await svc.createDivision(req.body), "Divisi berhasil dibuat");
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    return success(res, await svc.updateDivision(req.params.id, req.body), "Divisi berhasil diperbarui");
  } catch (err) { next(err); }
};

module.exports = { getAllController, getByIdController, createController, updateController };
