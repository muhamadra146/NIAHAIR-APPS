const prisma = require("../config/prisma");

const BATCH_SIZE = 100;

const expireMemberships = async () => {
  const now = new Date();
  let totalExpired = 0;

  // Loop until no more expired records remain — handles batches > BATCH_SIZE
  while (true) {
    const expired = await prisma.customerMembership.findMany({
      where: { status: "ACTIVE", endDate: { lte: now } },
      select: { id: true, customerId: true },
      take: BATCH_SIZE,
    });

    if (expired.length === 0) break;

    const customerIds = expired.map((r) => r.customerId);
    const recordIds   = expired.map((r) => r.id);

    await prisma.$transaction([
      prisma.customerMembership.updateMany({
        where: { id: { in: recordIds } },
        data:  { status: "EXPIRED" },
      }),
      // Null out the customer FK only if this record is still the active membership
      // (guards against edge case where a new membership was assigned mid-batch)
      prisma.customer.updateMany({
        where: {
          id:           { in: customerIds },
          membershipId: { not: null },
          customerMemberships: {
            none: {
              status:  "ACTIVE",
              endDate: { gt: now },
              id:      { notIn: recordIds },
            },
          },
        },
        data: { membershipId: null },
      }),
    ]);

    totalExpired += expired.length;
    console.log(`[expiry worker] expired ${totalExpired} memberships so far`);

    if (expired.length < BATCH_SIZE) break;
  }

  if (totalExpired > 0) {
    console.log(`[expiry worker] done — total expired: ${totalExpired}`);
  }
};

module.exports = { expireMemberships };
