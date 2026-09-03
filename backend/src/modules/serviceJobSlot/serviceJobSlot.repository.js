const prisma = require("../../config/prisma");

const findAllByItem = (itemId, includeInactive = false) =>
  prisma.serviceJobSlot.findMany({
    where: {
      itemId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      serviceJobRole: {
        select: { id: true, roleName: true, commissionRate: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

const findById = (id) =>
  prisma.serviceJobSlot.findUnique({ where: { id } });

const findByItemAndSlotKey = (itemId, slotKey) =>
  prisma.serviceJobSlot.findUnique({ where: { itemId_slotKey: { itemId, slotKey } } });

const create = (data) =>
  prisma.serviceJobSlot.create({ data });

const update = (id, data) =>
  prisma.serviceJobSlot.update({ where: { id }, data });

const hardDelete = (id) =>
  prisma.serviceJobSlot.delete({ where: { id } });

const countAssignments = (id) =>
  prisma.treatmentJobAssignment.count({ where: { serviceJobSlotId: id } });

module.exports = { findAllByItem, findById, findByItemAndSlotKey, create, update, hardDelete, countAssignments };
