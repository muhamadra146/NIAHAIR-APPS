const prisma = require("../../config/prisma");

const INCLUDE = {
  customer: {
    select: { id: true, name: true, mobilePhone: true },
  },
  branch: {
    select: { id: true, name: true },
  },
  appointment: {
    select: { id: true, bookingNo: true, visitDate: true, status: true },
  },
  treatmentItems: {
    select: {
      id:                 true,
      itemId:             true,
      unitId:             true,
      qty:                true,
      priceSnapshot:      true,
      conversionSnapshot: true,
      notes:              true,
      createdAt:          true,
    },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.treatmentSession.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.treatmentSession.count({ where });

const findById = (id) =>
  prisma.treatmentSession.findUnique({ where: { id }, include: INCLUDE });

const findCustomerById = (id) =>
  prisma.customer.findUnique({ where: { id }, select: { id: true } });

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true } });

const findAppointmentById = (id) =>
  prisma.appointment.findUnique({ where: { id }, select: { id: true } });

const create = (data) =>
  prisma.treatmentSession.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.treatmentSession.update({ where: { id }, data, include: INCLUDE });

module.exports = {
  findAll,
  count,
  findById,
  findCustomerById,
  findBranchById,
  findAppointmentById,
  create,
  update,
};
