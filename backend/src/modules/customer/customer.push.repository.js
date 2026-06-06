const prisma = require("../../config/prisma");

// Called after a successful Accurate push.
// Only writes customerNo when we actually have one — never overwrites with null.
const updateAfterPush = (id, { accurateCustomerId, customerNo }) => {
  const data = {
    accurateCustomerId,
    syncStatus:        "SYNCED",
    syncError:         null,
    lastSyncAt:        new Date(),
    lastSyncAttemptAt: new Date(),
  };
  if (customerNo) data.customerNo = customerNo;
  return prisma.customer.update({ where: { id }, data });
};

// Called when an Accurate push attempt fails.
const markSyncFailed = (id, errorMessage) =>
  prisma.customer.update({
    where: { id },
    data: {
      syncStatus:        "FAILED",
      syncError:         String(errorMessage).slice(0, 500),
      lastSyncAttemptAt: new Date(),
    },
  });

// Find all locally-created customers that reached Accurate but came back without a customerNo.
const findCustomersMissingCustomerNo = () =>
  prisma.customer.findMany({
    where: {
      accurateCustomerId: { not: null },
      customerNo:         null,
    },
    select: { id: true, accurateCustomerId: true, name: true },
  });

// Find all locally-created customers whose last sync attempt failed.
const findFailedSyncs = () =>
  prisma.customer.findMany({
    where: { syncSource: "LOCAL", syncStatus: "FAILED" },
    select: { id: true, name: true, syncError: true, lastSyncAttemptAt: true },
  });

module.exports = {
  updateAfterPush,
  markSyncFailed,
  findCustomersMissingCustomerNo,
  findFailedSyncs,
};
