const prisma = require("../../config/prisma");

const findAll = () => prisma.taxSetting.findMany({ orderBy: { year: "desc" } });

const findById = (id) => prisma.taxSetting.findUnique({ where: { id } });

const findByYear = (year) => prisma.taxSetting.findUnique({ where: { year } });

const create = (data) => prisma.taxSetting.create({ data });

const update = (id, data) => prisma.taxSetting.update({ where: { id }, data });

module.exports = { findAll, findById, findByYear, create, update };
