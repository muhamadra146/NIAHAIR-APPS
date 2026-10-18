const prisma = require("../../config/prisma");

/**
 * Fetch notes for a customer, newest first.
 * Supports pagination via skip/take (default: latest 50).
 */
const findAllByCustomer = (customerId, { skip = 0, take = 50 } = {}) =>
  prisma.customerNote.findMany({
    where:   { customerId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

const create = (data) => prisma.customerNote.create({ data });

const findById = (id) => prisma.customerNote.findUnique({ where: { id } });

const update = (id, data) => prisma.customerNote.update({ where: { id }, data });

const remove = (id) => prisma.customerNote.delete({ where: { id } });

/** Nama karyawan pemilik akun (penulis catatan) */
const findAuthorNameByUserId = async (userId) => {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { email: true, employee: { select: { name: true } } },
  });
  return user?.employee?.name ?? user?.email ?? null;
};

/** Peta email login → nama karyawan (catatan lama tersimpan dengan email penulis) */
const findAuthorNamesByEmails = async (emails) => {
  if (emails.length === 0) return {};
  const users = await prisma.user.findMany({
    where:  { email: { in: emails, mode: "insensitive" } },
    select: { email: true, employee: { select: { name: true } } },
  });
  return Object.fromEntries(users.filter((u) => u.employee?.name).map((u) => [u.email.toLowerCase(), u.employee.name]));
};

module.exports = { findAllByCustomer, create, findById, update, remove, findAuthorNameByUserId, findAuthorNamesByEmails };
