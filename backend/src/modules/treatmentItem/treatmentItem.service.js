const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const {
  findBySession,
  findById,
  create,
  update,
  deleteById,
  findSessionById,
  findItemById,
  findItemUnit,
  findActiveItemPrice,
} = require("./treatmentItem.repository");

const getBySession = async (sessionId) => {
  const session = await findSessionById(sessionId);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);
  return findBySession(sessionId);
};

const getById = async (id) => {
  const item = await findById(id);
  if (!item) throw new AppError("Treatment item not found", StatusCodes.NOT_FOUND);
  return item;
};

const createTreatmentItem = async (sessionId, body) => {
  const { itemId, unitId, qty, notes } = body;

  // 1 — session must exist
  const session = await findSessionById(sessionId);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

  // 2 — item must exist
  const item = await findItemById(itemId);
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);

  // 3 — unit must be registered for this item; provides conversionFactor
  const itemUnit = await findItemUnit(itemId, unitId);
  if (!itemUnit) {
    throw new AppError(
      "Unit is not registered for this item. Check item_units.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }
  const conversionSnapshot = Number(itemUnit.conversionFactor);

  // 4 — global active price must exist; provides priceSnapshot
  const itemPrice = await findActiveItemPrice(itemId, unitId);
  if (!itemPrice) {
    throw new AppError(
      "No active price found for this item and unit. Sync prices first.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }
  const priceSnapshot = Number(itemPrice.sellingPrice);

  return create({
    treatmentSessionId: sessionId,
    itemId,
    unitId,
    qty,
    conversionSnapshot,
    priceSnapshot,
    notes: notes ?? null,
  });
};

const updateTreatmentItem = async (id, body) => {
  const item = await findById(id);
  if (!item) throw new AppError("Treatment item not found", StatusCodes.NOT_FOUND);

  // Snapshots are never updated — only qty and notes are mutable.
  const data = {};
  if (body.qty   !== undefined) data.qty   = body.qty;
  if (body.notes !== undefined) data.notes = body.notes;

  return update(id, data);
};

const deleteTreatmentItem = async (id) => {
  const item = await findById(id);
  if (!item) throw new AppError("Treatment item not found", StatusCodes.NOT_FOUND);

  // Guard: cannot delete if employees are already assigned
  if (item._count.assignments > 0) {
    throw new AppError(
      `Cannot delete: ${item._count.assignments} assignment(s) exist for this item. Remove assignments first.`,
      StatusCodes.CONFLICT
    );
  }

  await deleteById(id);
};

module.exports = {
  getBySession,
  getById,
  createTreatmentItem,
  updateTreatmentItem,
  deleteTreatmentItem,
};
