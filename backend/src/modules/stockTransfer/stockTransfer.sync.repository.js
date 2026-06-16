const prisma = require("../../config/prisma");

const findTransferForSync = (id) =>
  prisma.stockTransfer.findUnique({
    where: { id },
    select: {
      id:                    true,
      transferNo:            true,
      transferDate:          true,
      notes:                 true,
      status:                true,
      accurateTransferId:    true,
      sourceWarehouse: {
        select: {
          id:                  true,
          name:                true,
          accurateWarehouseId: true,
        },
      },
      destinationWarehouse: {
        select: {
          id:                  true,
          name:                true,
          accurateWarehouseId: true,
        },
      },
      items: {
        select: {
          id:              true,
          qty:             true,
          accurateDetailId: true,
          item: {
            select: {
              id:            true,
              name:          true,
              itemCode:      true,
              itemType:      true,
              accurateItemId: true,
              defaultUnit: {
                select: {
                  id:            true,
                  name:          true,
                  accurateUnitId: true,
                },
              },
            },
          },
        },
      },
    },
  });

const markTransferSynced = ({ id, accurateTransferId, accurateTransferNumber }) =>
  prisma.stockTransfer.update({
    where: { id },
    data: {
      accurateTransferId,
      accurateTransferNumber,
      lastSyncAt: new Date(),
    },
  });

const markTransferItemSynced = (itemId, accurateDetailId) =>
  prisma.stockTransferItem.update({
    where: { id: itemId },
    data:  { accurateDetailId },
  });

module.exports = { findTransferForSync, markTransferSynced, markTransferItemSynced };
