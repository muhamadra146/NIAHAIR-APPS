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
const { syncInvoiceToAccurate } = require("../invoice/invoice.sync.service");

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
      // Reverse existing movement first so generateServiceMovement can recreate with new qty
      const existing = await findUsageItemById(row.id);
      if (existing?.inventoryMovementId) {
        await reverseServiceUsageMovement(existing.inventoryMovementId, row.id);
      }
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

  // Re-sync to Accurate if treatment session is already completed
  if (session.completedAt && session.invoiceId) {
    syncInvoiceToAccurate(session.invoiceId).catch((err) => {
      console.warn(`[materialUsage bulkSave] Accurate re-sync failed for invoice ${session.invoiceId}: ${err.message}`);
    });
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

  // Re-sync to Accurate if session is completed
  const sessionId = item.materialUsage?.treatmentItem?.treatmentSessionId;
  if (sessionId) {
    const session = await findSessionById(sessionId);
    if (session?.completedAt && session?.invoiceId) {
      syncInvoiceToAccurate(session.invoiceId).catch((err) => {
        console.warn(`[materialUsage removeUsageItem] Accurate re-sync failed for invoice ${session.invoiceId}: ${err.message}`);
      });
    }
  }
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

    // Re-sync to Accurate if session is already completed
    const session = await findSessionById(sessionId);
    if (session?.completedAt && session?.invoiceId) {
      syncInvoiceToAccurate(session.invoiceId).catch((err) => {
        console.warn(`[materialUsage editQty] Accurate re-sync failed for invoice ${session.invoiceId}: ${err.message}`);
      });
    }
  }

  return findUsageItemById(id);
};

module.exports = { getBySession, bulkSave, removeUsageItem, editUsageItemQty };
