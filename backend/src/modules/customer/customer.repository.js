const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.customer.findMany({
    skip,
    take,
    where,
    orderBy: orderBy ?? { createdAt: "desc" },
    include: {
      membership: { select: { id: true, name: true } },
    },
  });

const count = (where) => prisma.customer.count({ where });

const findById = (id) =>
  prisma.customer.findUnique({
    where: { id },
    include: {
      membership: { select: { id: true, name: true } },
    },
  });

const findByCustomerNo = (customerNo) =>
  prisma.customer.findUnique({ where: { customerNo } });

// CRM-001/CRM-005: nomor dibandingkan dalam bentuk baku 628xx — data lama bisa tersimpan
// "08xx", "628xx", "+62 812-…" (hasil sinkron Accurate), jadi pemisah dibuang & 0 → 62 di SQL.
// canonicalPhone: nomor baku 628xx (lihat customer.fields)
const findByPhone = async (canonicalPhone, excludeId = null) => {
  const rows = await prisma.$queryRaw`
    SELECT "id", "name", "customerNo", "mobilePhone"
    FROM "customers"
    WHERE regexp_replace(regexp_replace(COALESCE("mobilePhone", ''), '[^0-9]', '', 'g'), '^0', '62') = ${canonicalPhone}
      AND (${excludeId}::text IS NULL OR "id" <> ${excludeId}::text)
    LIMIT 1
  `;
  return rows[0] ?? null;
};

// Email tanpa beda huruf besar/kecil
const findByEmail = (email, excludeId = null) =>
  prisma.customer.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
  });

const findMaxCustomerNo = async () => {
  const result = await prisma.$queryRaw`
    SELECT "customerNo"
    FROM "customers"
    WHERE "customerNo" LIKE 'CUS-%'
    ORDER BY "customerNo" DESC
    LIMIT 1
  `;
  if (!result || result.length === 0) return 0;
  const last = result[0].customerNo;
  const seq  = parseInt(last.replace("CUS-", ""), 10);
  return isNaN(seq) ? 0 : seq;
};

const create = (data) => prisma.customer.create({ data });

const update = (id, data) =>
  prisma.customer.update({ where: { id }, data });

module.exports = {
  findAll,
  count,
  findById,
  findByCustomerNo,
  findByPhone,
  findByEmail,
  findMaxCustomerNo,
  create,
  update,
};
