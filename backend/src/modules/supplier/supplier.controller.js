'use strict';

const { StatusCodes }              = require("http-status-codes");
const { success }                  = require("../../common/responses/apiResponse");
const { syncSuppliersFromAccurate, getSuppliers } = require("./supplier.sync.service");

const syncSuppliersController = async (req, res, next) => {
  try {
    const result = await syncSuppliersFromAccurate();
    success(res, result, "Supplier berhasil disinkronkan dari Accurate", StatusCodes.OK);
  } catch (err) {
    next(err);
  }
};

const getSuppliersController = async (req, res, next) => {
  try {
    const result = await getSuppliers(req.query);
    success(res, result, "OK");
  } catch (err) {
    next(err);
  }
};

module.exports = { syncSuppliersController, getSuppliersController };
