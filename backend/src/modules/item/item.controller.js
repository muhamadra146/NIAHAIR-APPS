const { success, created } = require("../../common/responses/apiResponse");
const { getAll, getById, createItem, updateItem, getServiceMaterials } = require("./item.service");
const { accurateRequest } = require("../accurate/accurate.client");
const prisma = require("../../config/prisma");

const getAllController = async (req, res, next) => {
  try {
    const result = await getAll(req.query);
    return success(res, result, "Items fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getById(req.params.id);
    return success(res, result, "Item fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const { item, message } = await createItem(req.body);
    return created(res, item, message);
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateItem(req.params.id, req.body);
    return success(res, result, "Item updated");
  } catch (err) {
    next(err);
  }
};

const getServiceMaterialsController = async (req, res, next) => {
  try {
    const result = await getServiceMaterials(req.params.id);
    return success(res, result, "Service materials fetched");
  } catch (err) {
    next(err);
  }
};

// Temporary debug: fetch raw Accurate response for an item to discover field names
const debugAccurateItemController = async (req, res, next) => {
  try {
    const { itemCode } = req.query;
    if (!itemCode) return res.status(400).json({ error: "itemCode required" });

    const item = await prisma.item.findUnique({ where: { itemCode }, select: { id: true, name: true, accurateItemId: true } });
    if (!item || !item.accurateItemId) {
      return res.status(404).json({ error: "Item not found or not synced to Accurate" });
    }

    const raw = await accurateRequest(`/item/detail.do?id=${item.accurateItemId}&fields=detailSellingPrice,detailPurchasePrice,purchasePrice,vendorItem,defaultPurchaseUnit`);
    return res.json({ localItem: item, accurateResponse: raw });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllController, getByIdController, createController, updateController, getServiceMaterialsController, debugAccurateItemController };
