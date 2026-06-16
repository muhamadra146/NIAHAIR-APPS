const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, name: true } } } },
  branch:   { select: { id: true, code: true, name: true } },
  reviewer: { select: { id: true, name: true } },
};

const findAll = ({ skip, take, where }) =>
  prisma.permissionRequest.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });

const count = (where) => prisma.permissionRequest.count({ where });

const findById = (id) =>
  prisma.permissionRequest.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.permissionRequest.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.permissionRequest.update({ where: { id }, data, include: INCLUDE });

module.exports = { findAll, count, findById, create, update };
