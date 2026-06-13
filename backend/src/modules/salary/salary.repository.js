const prisma = require("../../config/prisma");

const findByEmployee = (employeeId) =>
  prisma.employeeSalarySettings.findMany({
    where: { employeeId },
    orderBy: { effectiveDate: "desc" },
  });

const findActiveByEmployee = (employeeId) =>
  prisma.employeeSalarySettings.findFirst({
    where: { employeeId, isActive: true },
    orderBy: { effectiveDate: "desc" },
  });

const findById = (id) =>
  prisma.employeeSalarySettings.findUnique({ where: { id } });

const create = (data) =>
  prisma.employeeSalarySettings.create({ data });

const update = (id, data) =>
  prisma.employeeSalarySettings.update({ where: { id }, data });

const deactivatePrevious = (employeeId, excludeId) =>
  prisma.employeeSalarySettings.updateMany({
    where: { employeeId, isActive: true, id: { not: excludeId } },
    data:  { isActive: false },
  });

module.exports = { findByEmployee, findActiveByEmployee, findById, create, update, deactivatePrevious };
