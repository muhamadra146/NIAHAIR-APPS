const prisma = require("../../config/prisma");
const { paginationMeta } = require("../../utils/pagination");

const INCLUDE = {
  customer:         { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  branch:           { select: { id: true, code: true, name: true } },
  filledByEmployee: { select: { id: true, employeeCode: true, name: true } },
  invoice: {
    select: {
      id:          true,
      invoiceNo:   true,
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
                  slotKey:  true,
                },
              },
            },
          },
        },
      },
    },
  },
};

// ── isNewClient helper ─────────────────────────────────────────────────────────
// "Klien Baru" = invoice ini adalah invoice pertama milik customer tersebut di NIA Hair.

const buildFirstInvoiceMap = async (customerIds) => {
  if (!customerIds.length) return new Map();
  const firsts = await prisma.invoice.findMany({
    where:    { customerId: { in: customerIds } },
    select:   { customerId: true, id: true },
    orderBy:  { invoiceDate: "asc" },
    distinct: ["customerId"],
  });
  return new Map(firsts.map((f) => [f.customerId, f.id]));
};

const enrichWithIsNewClient = async (notes) => {
  if (!notes || notes.length === 0) return notes;
  const customerIds = [...new Set(notes.map((n) => n.customerId))];
  const firstMap    = await buildFirstInvoiceMap(customerIds);
  return notes.map((n) => ({
    ...n,
    isNewClient: firstMap.get(n.customerId) === n.invoiceId,
  }));
};

// ── List (Semua Catatan) ───────────────────────────────────────────────────────

const findAll = async ({ skip, take, where }) => {
  const notes = await prisma.clientConsultationNote.findMany({
    skip, take, where,
    orderBy: { filledAt: "desc" },
    include:  INCLUDE,
  });
  return enrichWithIsNewClient(notes);
};

const count = (where) => prisma.clientConsultationNote.count({ where });

const findById = async (id) => {
  const note = await prisma.clientConsultationNote.findUnique({ where: { id }, include: INCLUDE });
  if (!note) return null;
  const [enriched] = await enrichWithIsNewClient([note]);
  return enriched;
};

const findByInvoiceId = (invoiceId) =>
  prisma.clientConsultationNote.findUnique({ where: { invoiceId }, include: INCLUDE });

// ── Unfilled invoices (Tab "Isi Catatan") ─────────────────────────────────────

const findUnfilledInvoices = async ({ branchId, search, skip, take }) => {
  // Kumpulkan invoice yg sudah ada catatannya
  const filled    = await prisma.clientConsultationNote.findMany({
    where:  branchId ? { branchId } : {},
    select: { invoiceId: true },
  });
  const filledIds = filled.map((f) => f.invoiceId);

  const where = {
    id:     { notIn: filledIds },
    status: { not: "CANCELLED" },
  };
  if (branchId) where.branchId = branchId;
  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { invoiceNo: { contains: search, mode: "insensitive" } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { invoiceDate: "asc" }, // terlama di atas = paling mendesak
      select: {
        id:          true,
        invoiceNo:   true,
        invoiceDate: true,
        branchId:    true,
        customer:    { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
        items:       { select: { item: { select: { id: true, name: true, itemType: true } } } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  // Enrich isNewClient
  const customerIds = [...new Set(invoices.map((i) => i.customer.id))];
  const firstMap    = await buildFirstInvoiceMap(customerIds);

  const enriched = invoices.map((inv) => ({
    ...inv,
    isNewClient: firstMap.get(inv.customer.id) === inv.id,
  }));

  return { data: enriched, total };
};

// ── isEmployeeAssignedToInvoice ───────────────────────────────────────────────

const isEmployeeAssignedToInvoice = async (invoiceId, employeeId) => {
  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: {
      createdByEmployeeId: true,
      treatmentSessions: {
        select: {
          treatmentItems: {
            select: {
              assignments: {
                where:  { employeeId },
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

// ── CRUD ──────────────────────────────────────────────────────────────────────

const create = (data) =>
  prisma.clientConsultationNote.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.clientConsultationNote.update({ where: { id }, data, include: INCLUDE });

const remove = (id) =>
  prisma.clientConsultationNote.delete({ where: { id } });

// ── Stats ─────────────────────────────────────────────────────────────────────

const getStats = async (where) => {
  const notes = await prisma.clientConsultationNote.findMany({
    where,
    select: {
      customerId:       true,
      invoiceId:        true,
      profession:       true,
      ageRange:         true,
      dailyStyling:     true,
      discoveryChannel: true,
      reasonForService: true,
      hesitation:       true,
      previousExpType:  true,
    },
  });

  // Pisah klien baru vs lama
  const customerIds    = [...new Set(notes.map((n) => n.customerId))];
  const firstMap       = await buildFirstInvoiceMap(customerIds);
  const newNotes       = notes.filter((n) => firstMap.get(n.customerId) === n.invoiceId);
  const returningNotes = notes.filter((n) => firstMap.get(n.customerId) !== n.invoiceId);

  const tally = (items, field) => {
    const map = {};
    for (const n of items) {
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
    total:                notes.length,
    newClientCount:       newNotes.length,
    returningClientCount: returningNotes.length,
    // Acquisition stats hanya dari klien baru (lebih akurat untuk marketing)
    profession:           tally(newNotes, "profession"),
    ageRange:             tally(newNotes, "ageRange"),
    dailyStyling:         tally(newNotes, "dailyStyling"),
    discoveryChannel:     tally(newNotes, "discoveryChannel"),
    reasonForService:     tally(newNotes, "reasonForService"),
    hesitation:           tally(newNotes, "hesitation"),
    previousExpType:      tally(newNotes, "previousExpType"),
  };
};

module.exports = {
  findAll,
  count,
  findById,
  findByInvoiceId,
  findUnfilledInvoices,
  isEmployeeAssignedToInvoice,
  create,
  update,
  remove,
  getStats,
};
