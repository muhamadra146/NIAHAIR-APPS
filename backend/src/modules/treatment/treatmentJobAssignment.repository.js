const prisma = require("../../config/prisma");

/**
 * Batch upsert job assignments (sistem kategori-job).
 *
 * Strategy: per treatmentItem — hapus semua assignment ber-commissionJobId,
 * lalu buat ulang dari payload (hanya entry dengan employeeId + commissionJobId).
 *
 * Input: [{ treatmentItemId, commissionJobId, employeeId, workQty?, notes? }]
 *
 * @param {Array} assignments
 * @param {import('@prisma/client').PrismaClient|Object} [client] - opsional: outer transaction client.
 *   Jika diberikan, operasi dijalankan dalam konteks transaksi yang sudah ada (tidak buat tx baru).
 *   Jika tidak diberikan, buat transaksi sendiri.
 */
const upsertMany = async (assignments, client) => {
  const run = async (tx) => {
    const treatmentItemIds = [...new Set(assignments.map((a) => a.treatmentItemId))];
    for (const treatmentItemId of treatmentItemIds) {
      await tx.treatmentJobAssignment.deleteMany({
        where: { treatmentItemId, commissionJobId: { not: null } },
      });
    }

    const toCreate = assignments.filter((e) => e.employeeId && e.commissionJobId);
    return Promise.all(
      toCreate.map((e) =>
        tx.treatmentJobAssignment.create({
          data: {
            treatmentItemId:  e.treatmentItemId,
            commissionJobId:  e.commissionJobId,
            employeeId:       e.employeeId,
            workQty:          e.workQty ?? null,
            notes:            e.notes   ?? null,
          },
        })
      )
    );
  };

  if (client) return run(client);
  return prisma.$transaction(run);
};

module.exports = { upsertMany };
