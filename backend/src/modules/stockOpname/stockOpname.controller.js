const { StatusCodes }  = require("http-status-codes");
const { success }      = require("../../common/responses/apiResponse");
const svc              = require("./stockOpname.service");

const getAllController = async (req, res, next) => {
  try {
    const { page, limit, warehouseId, status } = req.query;
    const result = await svc.getAll({
      page:        page ? Number(page) : 1,
      limit:       limit ? Number(limit) : 20,
      warehouseId: warehouseId || undefined,
      status:      status || undefined,
    });
    success(res, result);
  } catch (err) { next(err); }
};

const getByIdController = async (req, res, next) => {
  try {
    const opname = await svc.getById(req.params.id);
    success(res, opname);
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const { warehouseId, notes } = req.body;
    const opname = await svc.create({
      warehouseId,
      notes,
      createdByEmployeeId: req.user?.employeeId ?? null,
    });
    success(res, opname, "Opname berhasil dibuat", StatusCodes.CREATED);
  } catch (err) { next(err); }
};

const updateItemsController = async (req, res, next) => {
  try {
    const result = await svc.updateItems(req.params.id, req.body.items);
    success(res, result, "Item opname berhasil diperbarui");
  } catch (err) { next(err); }
};

const postController = async (req, res, next) => {
  try {
    const result = await svc.post(
      req.params.id,
      req.user?.employeeId ?? null,
    );
    success(res, result, `Opname ${result.opnameNo} berhasil diposting`);
  } catch (err) { next(err); }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await svc.cancel(req.params.id);
    success(res, result, "Opname berhasil dibatalkan");
  } catch (err) { next(err); }
};

module.exports = {
  getAllController,
  getByIdController,
  createController,
  updateItemsController,
  postController,
  cancelController,
};
