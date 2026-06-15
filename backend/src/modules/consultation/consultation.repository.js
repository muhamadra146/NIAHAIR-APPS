const prisma = require("../../config/prisma");

const INCLUDE = {
  customer:        { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  branch:          { select: { id: true, code: true, name: true } },
  filledByEmployee: { select: { id: true, employeeCode: true, name: true } },
  invoice: {
    select: {
      id:         true,
      invoiceNo:  true,
      invoiceDate: true,
      items: {
        select: {
          item: { select: { id: true, name: true, itemType: true } },
        },
      },
      treatmentSessions: {
        select: {
          treatmentItems: {
            select: {
              assignments: {
                select: {
                  employee: { select: { id: true, name: true, employeeCode: true } },
                  slotKey: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.clientConsultationNote.findMany({
    skip, take, where,
    orderBy: { filledAt: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.clientConsultationNote.count({ where });

const findById = (id) =>
  prisma.clientConsultationNote.findUnique({ where: { id }, include: INCLUDE });

const findByInvoiceId = (invoiceId) =>
  prisma.clientConsultationNote.findUnique({ where: { invoiceId }, include: INCLUDE });

// Check if employee is assigned to invoice (via TreatmentAssignment or createdBy)
const isEmployeeAssignedToInvoice = async (invoiceId, employeeId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      createdByEmployeeId: true,
      treatmentSessions: {
        select: {
          treatmentItems: {
            select: {
              assignments: {
                where: { employeeId },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  if (!invoice) return false;
  if (invoice.createdByEmployeeId === employeeId) return true;
  return invoice.treatmentSessions.some((s) =>
    s.treatmentItems.some((ti) => ti.assignments.length > 0)
  );
};

const create = (data) =>
  prisma.clientConsultationNote.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.clientConsultationNote.update({ where: { id }, data, include: INCLUDE });

const remove = (id) =>
  prisma.clientConsultationNote.delete({ where: { id } });

// Stats for manager/owner rekap
const getStats = async (where) => {
  const notes = await prisma.clientConsultationNote.findMany({
    where,
    select: {
      profession:      true,
      ageRange:        true,
      dailyStyling:    true,
      discoveryChannel: true,
      reasonForService: true,
      hesitation:      true,
      previousExpType:  true,
    },
  });

  const tally = (field) => {
    const map = {};
    for (const n of notes) {
      const val = n[field];
      if (!val) continue;
      if (Array.isArray(val)) {
        for (const v of val) { map[v] = (map[v] ?? 0) + 1; }
      } else {
        map[val] = (map[val] ?? 0) + 1;
      }
    }
    return map;
  };

  return {
    total:            notes.length,
    profession:       tally("profession"),
    ageRange:         tally("ageRange"),
    dailyStyling:     tally("dailyStyling"),
    discoveryChannel: tally("discoveryChannel"),
    reasonForService: tally("reasonForService"),
    hesitation:       tally("hesitation"),
    previousExpType:  tally("previousExpType"),
  };
};

module.exports = {
  findAll,
  count,
  findById,
  findByInvoiceId,
  isEmployeeAssignedToInvoice,
  create,
  update,
  remove,
  getStats,
};
