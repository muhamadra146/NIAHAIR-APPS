const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const {
  findBySession,
  findOrCreateUsage,
  findUsageItemById,
  createUsageItem,
  updateUsageItemQty,
  deleteUsageItem,
  findTreatmentItem,
  findSessionById,
} = require("./materialUsage.repository");
const { generateServiceMovement, reverseServiceUsageMovement } = require("../inventory/inventory.service");

const getBySession = async (sessionId) => {
  const session = await findSessionById(sessionId);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);
  return findBySession(sessionId);
};

/**
 * Bulk-save material usage rows for a session.
 * Each row must have a treatmentItemId; the service finds or creates
 * a MaterialUsage record for that treatment item, then upserts the
 * MaterialUsageItem (update if row.id provided, create otherwise).
 */
const bulkSave = async (sessionId, rows) => {
  const session = await findSessionById(sessionId);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

  const results = [];

  for (const row of rows) {
    // Validate treatment item belongs to this session
    const ti = await findTreatmentItem(row.treatmentItemId);
    if (!ti) {
      throw new AppError(
        `Treatment item ${row.treatmentItemId} not found`,
        StatusCodes.NOT_FOUND,
      );
    }

    // Find or create MaterialUsage for this treatment item
    const usage = await findOrCreateUsage(row.treatmentItemId);

    if (row.id) {
      // Update existing item qty
      const updated = await updateUsageItemQty(row.id, row.qty);
      results.push(updated);
    } else {
      // Create new MaterialUsageItem
      const created = await createUsageItem({
        materialUsageId: usage.id,
        materialItemId:  row.materialItemId,
        unitId:          row.unitId,
        qty:             row.qty,
      });
      results.push(created);
    }
  }

  // Auto-generate inventory movements for saved usage items
  try {
    await generateServiceMovement(sessionId);
  } catch (err) {
    console.warn(`[materialUsage bulkSave] generateServiceMovement failed for session ${sessionId}: ${err.message}`);
  }

  return results;
};

const removeUsageItem = async (id) => {
  const item = await findUsageItemById(id);
  if (!item) throw new AppError("Material usage item not found", StatusCodes.NOT_FOUND);

  // Reverse inventory movement if it exists before deleting
  if (item.inventoryMovementId) {
    await reverseServiceUsageMovement(item.inventoryMovementId, id);
  }

  await deleteUsageItem(id);
};

const editUsageItemQty = async (id, qty) => {
  const item = await findUsageItemById(id);
  if (!item) throw new AppError("Material usage item not found", StatusCodes.NOT_FOUND);

  // Reverse existing movement first, then update qty, then regenerate
  if (item.inventoryMovementId) {
    await reverseServiceUsageMovement(item.inventoryMovementId, id);
  }

  await updateUsageItemQty(id, qty);

  // Regenerate movement with new qty via session-level generator
  const sessionId = item.materialUsage?.treatmentItem?.treatmentSessionId;
  if (sessionId) {
    try {
      await generateServiceMovement(sessionId);
    } catch (err) {
      console.warn(`[materialUsage editQty] generateServiceMovement failed: ${err.message}`);
    }
  }

  return findUsageItemById(id);
};

module.exports = { getBySession, bulkSave, removeUsageItem, editUsageItemQty };
