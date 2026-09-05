const prisma = require("../../config/prisma");

const findAllByItem = (itemId, includeInactive = false, { skip = 0, take = 10 } = {}) =>
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
    skip,
    take,
  });

const countByItem = (itemId, includeInactive = false) =>
  prisma.serviceJobSlot.count({
    where: {
      itemId,
      ...(includeInactive ? {} : { isActive: true }),
    },
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

module.exports = { findAllByItem, countByItem, findById, findByItemAndSlotKey, create, update, hardDelete, countAssignments };
