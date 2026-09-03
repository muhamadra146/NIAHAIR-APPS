const prisma = require("../../config/prisma");

/**
 * Load all job assignments for a treatment session,
 * grouped by treatmentItem with slot definitions from the item's ServiceJobSlots.
 *
 * Returns an array of treatmentItem objects, each with:
 *   - treatmentItemId, itemId, itemName, subtotal
 *   - slots[]: { serviceJobSlotId, slotKey, label, commissionRate, commissionMode,
 *                isRequired, sortOrder,
 *                assignments[]: { id, employeeId, employeeName, workQty, commissionAmount } }
 *
 * FIXED_RATE slots: assignments memiliki 0 atau 1 entry.
 * WORK_QTY   slots: assignments bisa banyak entry (beda employeeId).
 */
const findBySession = async (treatmentSessionId) => {
  const treatmentItems = await prisma.treatmentItem.findMany({
    where: { treatmentSessionId },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          serviceJobSlots: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              serviceJobRole: {
                select: { id: true, roleName: true, commissionRate: true },
              },
            },
          },
        },
      },
      jobAssignments: {
        include: {
          employee: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Items tanpa job slot dikembalikan kosong (backward compat)
  return treatmentItems
    .filter((ti) => ti.item.serviceJobSlots.length > 0)
    .map((ti) => ({
      treatmentItemId: ti.id,
      itemId:          ti.item.id,
      itemName:        ti.item.name,
      subtotal:        String(Number(ti.priceSnapshot) * Number(ti.qty)),
      slots: ti.item.serviceJobSlots.map((slot) => {
        const slotAssignments = ti.jobAssignments.filter(
          (a) => a.serviceJobSlotId === slot.id
        );
        return {
          serviceJobSlotId: slot.id,
          slotKey:          slot.slotKey,
          label:            slot.label,
          commissionRate:   String(slot.commissionRate),
          commissionMode:   slot.commissionMode,
          isRequired:       slot.isRequired,
          sortOrder:        slot.sortOrder,
          // Role-based fields (null untuk slot lama — backward compat)
          roleId:             slot.serviceJobRole?.id         ?? null,
          roleName:           slot.serviceJobRole?.roleName   ?? null,
          roleCommissionRate: slot.serviceJobRole?.commissionRate
                                ? String(slot.serviceJobRole.commissionRate)
                                : null,
          isMainJob:          slot.isMainJob,
          slotType:           slot.slotType,
          // assignments[] — plural karena WORK_QTY bisa banyak
          assignments: slotAssignments.map((a) => ({
            id:               a.id,
            employeeId:       a.employeeId,
            employeeName:     a.employee?.name ?? null,
            workQty:          a.workQty          !== null ? Number(a.workQty)          : null,
            commissionAmount: a.commissionAmount  !== null ? String(a.commissionAmount) : null,
            notes:            a.notes,
          })),
        };
      }),
    }));
};

/**
 * Batch upsert job assignments.
 *
 * Strategy per slot:
 *   FIXED_RATE — replace: hapus semua yang lama, buat 1 baru (employeeId)
 *   WORK_QTY   — replace: hapus semua yang lama, buat N baru (per employeeId + workQty)
 *
 * Input: [{ treatmentItemId, serviceJobSlotId, employeeId?, workQty? }]
 * Semua entry dengan serviceJobSlotId yang sama akan menggantikan assignment lama.
 */
/**
 * @param {Array} assignments
 * @param {import('@prisma/client').PrismaClient|Object} [client] - opsional: outer transaction client.
 *   Jika diberikan, operasi dijalankan dalam konteks transaksi yang sudah ada (tidak buat tx baru).
 *   Jika tidak diberikan, buat transaksi sendiri.
 */
const upsertMany = async (assignments, client) => {
  // Deteksi mode: commissionJobId (sistem baru) atau serviceJobSlotId (sistem lama)
  const useJobMode = assignments.some((a) => a.commissionJobId);

  // Grup per key unik
  const groups = new Map();
  for (const a of assignments) {
    const key = useJobMode
      ? `${a.treatmentItemId}::job::${a.commissionJobId}::${a.employeeId}`
      : `${a.treatmentItemId}::slot::${a.serviceJobSlotId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }

  const run = async (tx) => {
    const results = [];

    if (useJobMode) {
      // ── Mode baru: commissionJobId — hapus per treatmentItem lalu buat ulang ──
      const treatmentItemIds = [...new Set(assignments.map((a) => a.treatmentItemId))];
      for (const treatmentItemId of treatmentItemIds) {
        await tx.treatmentJobAssignment.deleteMany({
          where: { treatmentItemId, commissionJobId: { not: null } },
        });
      }

      const toCreate = assignments.filter((e) => e.employeeId && e.commissionJobId);
      if (toCreate.length > 0) {
        const created = await Promise.all(
          toCreate.map((e) =>
            tx.treatmentJobAssignment.create({
              data: {
                treatmentItemId:  e.treatmentItemId,
                commissionJobId:  e.commissionJobId,
                serviceJobSlotId: null,
                employeeId:       e.employeeId,
                workQty:          e.workQty         ?? null,
                commissionAmount: e.commissionAmount ?? null,
                notes:            e.notes           ?? null,
              },
            })
          )
        );
        results.push(...created);
      }
    } else {
      // ── Mode lama: serviceJobSlotId ──
      for (const [, entries] of groups) {
        const { treatmentItemId, serviceJobSlotId } = entries[0];

        await tx.treatmentJobAssignment.deleteMany({
          where: { treatmentItemId, serviceJobSlotId },
        });

        const toCreate = entries.filter((e) => e.employeeId);
        if (toCreate.length > 0) {
          const created = await Promise.all(
            toCreate.map((e) =>
              tx.treatmentJobAssignment.create({
                data: {
                  treatmentItemId,
                  serviceJobSlotId,
                  commissionJobId:  null,
                  employeeId:       e.employeeId,
                  workQty:          e.workQty         ?? null,
                  commissionAmount: e.commissionAmount ?? null,
                  notes:            e.notes           ?? null,
                },
              })
            )
          );
          results.push(...created);
        }
      }
    }

    return results;
  };

  if (client) return run(client);
  return prisma.$transaction(run);
};

module.exports = { findBySession, upsertMany };
