const prisma = require("../../config/prisma");

const SLOT_SELECT = {
  id:             true,
  slotKey:        true,
  label:          true,
  commissionRate: true,
  commissionMode: true,
  isMainJob:      true,
  slotType:       true,
  isRequired:     true,
  sortOrder:      true,
  isActive:       true,
};

const findAllByItem = (itemId, includeInactive = false) =>
  prisma.serviceJobRole.findMany({
    where: {
      itemId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      slots: {
        where: includeInactive ? {} : { isActive: true },
        select: SLOT_SELECT,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

const findById = (id) =>
  prisma.serviceJobRole.findUnique({
    where: { id },
    include: { slots: { select: SLOT_SELECT } },
  });

const findByItemAndName = (itemId, roleName) =>
  prisma.serviceJobRole.findUnique({
    where: { itemId_roleName: { itemId, roleName } },
  });

const create = (data) =>
  prisma.serviceJobRole.create({ data });

const update = (id, data) =>
  prisma.serviceJobRole.update({ where: { id }, data });

const countActiveSlots = (id) =>
  prisma.serviceJobSlot.count({ where: { roleId: id, isActive: true } });

const countAllSlots = (id) =>
  prisma.serviceJobSlot.count({ where: { roleId: id } });

const countSlotAssignments = (roleId) =>
  prisma.treatmentJobAssignment.count({
    where: { serviceJobSlot: { roleId } },
  });

const deleteSlotsByRole = (roleId, tx) =>
  (tx ?? prisma).serviceJobSlot.deleteMany({ where: { roleId } });

const hardDelete = (id) =>
  prisma.serviceJobRole.delete({ where: { id } });

module.exports = {
  findAllByItem,
  findById,
  findByItemAndName,
  create,
  update,
  countActiveSlots,
  countAllSlots,
  countSlotAssignments,
  deleteSlotsByRole,
  hardDelete,
};
