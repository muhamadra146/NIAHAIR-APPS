const prisma = require("../../config/prisma");

const findByKey = (key) =>
  prisma.setting.findUnique({ where: { key } });

const upsert = (key, value, description) =>
  prisma.setting.upsert({
    where:  { key },
    create: { key, value, description },
    update: { value },
  });

const findAll = () => prisma.setting.findMany({ orderBy: { key: "asc" } });

module.exports = { findByKey, upsert, findAll };
