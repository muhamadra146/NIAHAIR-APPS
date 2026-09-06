'use strict';

const { StatusCodes } = require("http-status-codes");
const { success }     = require("../../common/responses/apiResponse");
const {
  listPurchaseReturns,
  getPurchaseReturn,
  createPurchaseReturn,
  postPurchaseReturn,
  cancelPurchaseReturn,
  deletePurchaseReturn,
  syncReturnToAccurate,
} = require("./purchaseReturn.service");

const listController = async (req, res, next) => {
  try {
    const result = await listPurchaseReturns(req.query);
    success(res, result, "OK");
  } catch (err) { next(err); }
};

const getController = async (req, res, next) => {
  try {
    const ret = await getPurchaseReturn(req.params.id);
    success(res, ret, "OK");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const ret = await createPurchaseReturn(req.body, req.employee?.id);
    success(res, ret, "Retur pembelian berhasil dibuat", StatusCodes.CREATED);
  } catch (err) { next(err); }
};

const postController = async (req, res, next) => {
  try {
    const ret = await postPurchaseReturn(req.params.id, req.employee?.id);
    success(res, ret, "Retur pembelian berhasil di-posting");
  } catch (err) { next(err); }
};

const cancelController = async (req, res, next) => {
  try {
    const ret = await cancelPurchaseReturn(req.params.id);
    success(res, ret, "Retur pembelian berhasil dibatalkan");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deletePurchaseReturn(req.params.id);
    success(res, result, "Retur pembelian berhasil dihapus");
  } catch (err) { next(err); }
};

const syncController = async (req, res, next) => {
  try {
    const result = await syncReturnToAccurate(req.params.id);
    success(res, result, "Sinkronisasi Accurate berhasil");
  } catch (err) { next(err); }
};

module.exports = {
  listController,
  getController,
  createController,
  postController,
  cancelController,
  deleteController,
  syncController,
};
