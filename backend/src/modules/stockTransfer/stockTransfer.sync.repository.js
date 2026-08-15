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
          receivedQty:     true,
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

const markTransferReceiveSynced = ({ id, accurateReceiveId, accurateReceiveNumber }) =>
  prisma.$executeRawUnsafe(
    `UPDATE "stock_transfers"
     SET "accurateReceiveId" = $1, "accurateReceiveNumber" = $2, "lastReceiveSyncAt" = NOW()
     WHERE id = $3`,
    accurateReceiveId,
    accurateReceiveNumber ?? null,
    id,
  );

const markTransferItemSynced = (itemId, accurateDetailId) =>
  prisma.stockTransferItem.update({
    where: { id: itemId },
    data:  { accurateDetailId },
  });

const findReceiveAccurateId = (id) =>
  prisma.$queryRawUnsafe(
    `SELECT "accurateReceiveId" FROM "stock_transfers" WHERE id = $1`,
    id,
  ).then((rows) => rows[0]?.accurateReceiveId ?? null);

module.exports = {
  findTransferForSync,
  markTransferSynced,
  markTransferReceiveSynced,
  markTransferItemSynced,
  findReceiveAccurateId,
};
