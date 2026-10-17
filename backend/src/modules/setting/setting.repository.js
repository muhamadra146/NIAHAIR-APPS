const prisma = require("../../config/prisma");

const findByKey = (key) =>
  prisma.setting.findUnique({ where: { key } });

// description ikut diperbarui bila dikirim (G5-15); undefined = tidak diubah
const upsert = (key, value, description) =>
  prisma.setting.upsert({
    where:  { key },
    create: { key, value, description },
    update: { value, ...(description !== undefined && { description }) },
  });

const findAll = () => prisma.setting.findMany({ orderBy: { key: "asc" } });

module.exports = { findByKey, upsert, findAll };
