const { StatusCodes }             = require("http-status-codes");
const AppError                     = require("../../common/errors/AppError");
const prisma                       = require("../../config/prisma");
const { accurateRequest }          = require("../accurate/accurate.client");
const { mapAdjustmentToAccurate }  = require("./inventory.adjustment.sync.mapper");

const ACCURATE_ITEM_ADJUSTMENT_SAVE = "/item-adjustment/save.do";

const pushAdjustmentToAccurate = async (movementId) => {
  const movement = await prisma.inventoryMovement.findUnique({
    where:  { id: movementId },
    select: {
      id:                  true,
      qtyChange:           true,
      notes:               true,
      reason:              true,
      createdAt:           true,
      accurateAdjustmentId: true,
      glAccount: {
        select: { id: true, accurateGlAccountId: true, name: true },
      },
      inventory: {
        select: {
          id:        true,
          warehouse: { select: { id: true, name: true, accurateWarehouseId: true } },
          item: {
            select: {
              id:            true,
              name:          true,
              itemCode:      true,
              itemType:      true,
              accurateItemId: true,
              defaultUnit: {
                select: { id: true, name: true, accurateUnitId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!movement) throw new AppError("Movement not found", StatusCodes.NOT_FOUND);

  // Idempotency — skip if already pushed
  if (movement.accurateAdjustmentId) {
    return { skipped: true, reason: "Already synced to Accurate" };
  }

  // Only INVENTORY items can be pushed
  if (movement.inventory.item.itemType !== "INVENTORY") {
    return { skipped: true, reason: "Item type is not INVENTORY" };
  }

  if (!movement.inventory.item.accurateItemId) {
    throw new AppError(
      `Item belum tersinkron ke Accurate: ${movement.inventory.item.itemCode}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  if (!movement.inventory.item.defaultUnit?.accurateUnitId) {
    throw new AppError(
      `Satuan default item belum tersinkron ke Accurate: ${movement.inventory.item.itemCode}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  if (!movement.inventory.warehouse.accurateWarehouseId) {
    throw new AppError(
      `Gudang belum tersinkron ke Accurate: ${movement.inventory.warehouse.name}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  if (!movement.glAccount?.accurateGlAccountId) {
    throw new AppError(
      "Akun penyesuaian belum tersinkron ke Accurate",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  // Look up cost price for inventory valuation in Accurate
  const itemPrice = await prisma.itemPrice.findFirst({
    where:   { itemId: movement.inventory.item.id, unitId: movement.inventory.item.defaultUnit.id, isActive: true },
    orderBy: { effectiveDate: "desc" },
    select:  { costPrice: true },
  });
  const unitCostPrice = itemPrice?.costPrice ? Number(itemPrice.costPrice) : 0;

  const payload = mapAdjustmentToAccurate({
    movement,
    inventory:      movement.inventory,
    glAccount:      movement.glAccount,
    unitCostPrice,
  });

  console.log("[adjustment sync payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_ITEM_ADJUSTMENT_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s || !response.r?.id) {
    throw new AppError(
      `Accurate API error: ${JSON.stringify(response)}`,
      StatusCodes.BAD_GATEWAY
    );
  }

  const accurateAdjustmentId = response.r.id;

  await prisma.inventoryMovement.update({
    where: { id: movementId },
    data:  { accurateAdjustmentId },
  });

  console.log(`[adjustment sync] success movementId=${movementId} accurateId=${accurateAdjustmentId}`);

  return { synced: true, accurateAdjustmentId };
};

module.exports = { pushAdjustmentToAccurate };
