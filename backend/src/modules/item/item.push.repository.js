const prisma = require("../../config/prisma");

const updateAfterPush = (id, { accurateItemId, itemCode }) => {
  const data = { accurateItemId, lastSyncAt: new Date() };
  if (itemCode) data.itemCode = itemCode;
  return prisma.item.update({ where: { id }, data });
};

module.exports = { updateAfterPush };
