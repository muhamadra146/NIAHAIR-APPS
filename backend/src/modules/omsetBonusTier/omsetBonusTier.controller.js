const { StatusCodes }       = require("http-status-codes");
const { success, created }  = require("../../common/responses/apiResponse");
const svc                   = require("./omsetBonusTier.service");

const getByEmployeeController = async (req, res, next) => {
  try {
    const data = await svc.getByEmployee(req.params.employeeId);
    success(res, data);
  } catch (e) { next(e); }
};

const createController = async (req, res, next) => {
  try {
    const data = await svc.create(req.params.employeeId, req.body);
    created(res, data, "Omset bonus tier berhasil dibuat");
  } catch (e) { next(e); }
};

const updateController = async (req, res, next) => {
  try {
    const data = await svc.update(req.params.id, req.body);
    success(res, data, "Omset bonus tier berhasil diupdate");
  } catch (e) { next(e); }
};

const deleteController = async (req, res, next) => {
  try {
    await svc.remove(req.params.id);
    success(res, null, "Omset bonus tier berhasil dihapus");
  } catch (e) { next(e); }
};

module.exports = { getByEmployeeController, createController, updateController, deleteController };
