'use strict';

const { StatusCodes } = require("http-status-codes");
const { success }     = require("../../common/responses/apiResponse");
const {
  listPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  cancelPurchaseInvoice,
  deletePurchaseInvoice,
  getLastPurchasePrice,
} = require("./purchase.service");

const listController = async (req, res, next) => {
  try {
    const result = await listPurchaseInvoices(req.query);
    success(res, result, "OK");
  } catch (err) { next(err); }
};

const getController = async (req, res, next) => {
  try {
    const invoice = await getPurchaseInvoice(req.params.id);
    success(res, invoice, "OK");
  } catch (err) { next(err); }
};

const createController = async (req, res, next) => {
  try {
    const invoice = await createPurchaseInvoice(req.body, req.employee?.id);
    success(res, invoice, "Faktur pembelian berhasil dibuat", StatusCodes.CREATED);
  } catch (err) { next(err); }
};

const updateController = async (req, res, next) => {
  try {
    const invoice = await updatePurchaseInvoice(req.params.id, req.body);
    success(res, invoice, "Faktur pembelian berhasil diperbarui");
  } catch (err) { next(err); }
};

const cancelController = async (req, res, next) => {
  try {
    const result = await cancelPurchaseInvoice(req.params.id);
    success(res, result, "Faktur pembelian berhasil dibatalkan");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    const result = await deletePurchaseInvoice(req.params.id);
    success(res, result, "Faktur pembelian berhasil dihapus");
  } catch (err) { next(err); }
};

const lastPriceController = async (req, res, next) => {
  try {
    const result = await getLastPurchasePrice(req.params.itemId, req.query.unitId);
    success(res, result, "OK");
  } catch (err) { next(err); }
};

module.exports = { listController, getController, createController, updateController, cancelController, deleteController, lastPriceController };
