const prisma = require("../../config/prisma");

const INCLUDE = {
  branch:      { select: { id: true, name: true } },
  appointment: {
    select: {
      id: true, bookingNo: true, visitDate: true,
      customer: { select: { id: true, name: true, mobilePhone: true } },
      staffs:   { select: { employee: { select: { id: true, name: true, employeeCode: true } } } },
    },
  },
  invoice:  { select: { id: true, invoiceNo: true, grandTotal: true } },
  employee: { select: { id: true, name: true, employeeCode: true } },
};

const findAll = ({ skip, take, where }) =>
  prisma.complaint.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });

const count = (where) => prisma.complaint.count({ where });

const findById = (id) => prisma.complaint.findUnique({ where: { id }, include: INCLUDE });

const findByNo = (complaintNo) => prisma.complaint.findUnique({ where: { complaintNo }, include: INCLUDE });

const findMaxSeqToday = async (prefix) => {
  const last = await prisma.complaint.findFirst({
    where:   { complaintNo: { startsWith: prefix } },
    orderBy: { complaintNo: "desc" },
    select:  { complaintNo: true },
  });
  if (!last) return 0;
  const seq = parseInt(last.complaintNo.slice(prefix.length), 10);
  return isNaN(seq) ? 0 : seq;
};

const create = (data) => prisma.complaint.create({ data, include: INCLUDE });

const update = (id, data) => prisma.complaint.update({ where: { id }, data, include: INCLUDE });

const remove = (id) => prisma.complaint.delete({ where: { id } });

module.exports = { findAll, count, findById, findByNo, findMaxSeqToday, create, update, remove };
