const prisma = require("../../config/prisma");
const { JOB_CALC_SELECT } = require("../commission/commission.repository");
const { ELIGIBILITY_ITEM_SELECT, DISCOUNT_CATEGORIES_SELECT } = require("../membership/membership.discount");

const INCLUDE = {
  customer:          { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  branch:            { select: { id: true, code: true, name: true } },
  createdByEmployee: { select: { id: true, employeeCode: true, name: true } },
  // Paket membership saat invoice dibuat — untuk memisahkan teks diskon membership dari diskon item
  membership:        { select: { id: true, name: true, discountType: true, discountValue: true, discountCategories: DISCOUNT_CATEGORIES_SELECT } },
  items: {
    include: {
      item: { select: { id: true, name: true, itemCode: true, itemType: true, ...ELIGIBILITY_ITEM_SELECT } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  payments: {
    include: {
      paymentMethod: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  invoiceDeposits: {
    include: {
      deposit: {
        // Nomor DP (nomor faktur DP Accurate) + tanggal untuk tampilan "Deposit Diterapkan" & struk
        select: { id: true, amount: true, status: true, paidAt: true, createdAt: true, accurateDepositNumber: true },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  treatmentSessions: {
    select: { id: true, startedAt: true, completedAt: true, notes: true },
  },
};

// ── Daily assignment INCLUDE (heavier — treatmentItems + assignments) ──

const DAILY_INCLUDE = {
  customer: { select: { id: true, name: true, customerNo: true } },
  treatmentSessions: {
    include: {
      treatmentItems: {
        include: {
          item: { select: { id: true, name: true, itemCode: true } },
          unit: { select: { id: true, name: true } },
          assignments: {
            include: {
              employee: { select: { id: true, name: true, employeeCode: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  },
  _count: { select: { commissions: true } },
};

const findCommissionGenerateList = ({ skip, take, where }) =>
  prisma.invoice.findMany({
    skip,
    take,
    where,
    select: {
      id:                true,
      invoiceNo:         true,
      invoiceDate:       true,
      grandTotal:        true,
      commissionSkipped: true,
      customer: { select: { id: true, name: true, customerNo: true } },
      branch:   { select: { id: true, name: true } },
      _count:   { select: { commissions: true } },
    },
    orderBy: { invoiceDate: "desc" },
  });

const findDailyAssignment = ({ start, end, branchId }) => {
  const where = { invoiceDate: { gte: start, lte: end } };
  if (branchId) where.branchId = branchId;
  return prisma.invoice.findMany({
    where,
    include:  DAILY_INCLUDE,
    orderBy:  { createdAt: "asc" },
    take:     100,
  });
};

// ── Job Assignment INCLUDE (berat — untuk GenerateKomisiPage baru) ────

const JOB_ASSIGNMENT_INCLUDE = {
  customer: { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  treatmentSessions: {
    include: {
      appointment: {
        include: {
          staffs: {
            include: {
              employee: { select: { id: true, name: true, employeeCode: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      treatmentItems: {
        include: {
          item: {
            select: {
              id: true, name: true, itemCode: true, itemType: true,
              commissionCategoryId: true,
              commissionCategory: {
                select: {
                  id: true, code: true, name: true, allowAnyStaff: true,
                  jobs: {
                    where:   { isActive: true },
                    select:  { id: true, name: true, jobKey: true, sortOrder: true, deductsFromJobId: true, pricePerUnit: true, unit: true, splitMode: true, defaultQty: true },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
          unit: { select: { id: true, name: true } },
          jobAssignments: {
            where:   { employeeId: { not: null } },
            include: {
              employee:      { select: { id: true, name: true, employeeCode: true } },
              commissionJob: { select: { id: true, name: true, jobKey: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  },
  commissions: { select: { id: true, status: true } },
  _count:      { select: { commissions: true } },
  // COM-014: Input Job butuh Catatan Klien lebih dulu
  consultationNote: { select: { id: true } },
};

// Item treatment invoice + job kategori — untuk validasi batas qty Input Job (COM-015)
const findTreatmentItemsForJobLimit = (invoiceId) =>
  prisma.treatmentItem.findMany({
    where:  { treatmentSession: { invoiceId } },
    select: {
      id: true, qty: true, conversionSnapshot: true,
      item: {
        select: {
          name: true,
          commissionCategory: {
            select: { jobs: { select: { id: true, name: true, unit: true, splitMode: true, deductsFromJobId: true } } },
          },
        },
      },
    },
  });

const findAllPaidForJobAssignment = ({ branchId, gteDate, lteDate }) => {
  const where = { status: "PAID" };
  if (branchId) where.branchId = branchId;
  if (gteDate || lteDate) {
    where.invoiceDate = {};
    if (gteDate) where.invoiceDate.gte = gteDate;
    if (lteDate) where.invoiceDate.lte = lteDate;
  }
  return prisma.invoice.findMany({
    where,
    include:  JOB_ASSIGNMENT_INCLUDE,
    orderBy:  { invoiceDate: "desc" },
    take:     200,
  });
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.invoice.findMany({ skip, take, where, orderBy: orderBy ?? { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.invoice.count({ where });

const findById = (id) =>
  prisma.invoice.findUnique({ where: { id }, include: INCLUDE });

const countToday = (startOfDay) =>
  prisma.invoice.count({ where: { createdAt: { gte: startOfDay } } });

const findMaxInvoiceSeqToday = async (prefix) => {
  const result = await prisma.invoice.findFirst({
    where:   { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
    select:  { invoiceNo: true },
  });
  if (!result) return 0;
  const seq = parseInt(result.invoiceNo.split("-").pop(), 10);
  return isNaN(seq) ? 0 : seq;
};

// ── Lookup helpers ────────────────────────────────────────────────────

const findCustomerById = (id) =>
  prisma.customer.findUnique({ where: { id }, select: { id: true, name: true } });

const findAppointmentById = (id) =>
  prisma.appointment.findUnique({ where: { id }, select: { id: true, customerId: true } });

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true, name: true } });

const findItemById = (id) =>
  prisma.item.findUnique({
    where: { id },
    select: { id: true, itemCode: true, name: true, itemType: true, ...ELIGIBILITY_ITEM_SELECT },
  });

const findItemUnit = ({ itemId, unitId }) =>
  prisma.itemUnit.findUnique({
    where: { itemId_unitId: { itemId, unitId } },
    select: { id: true },
  });

const findActivePrice = ({ itemId, unitId, branchId }) =>
  prisma.itemPrice.findFirst({
    where: { itemId, unitId, branchId, isActive: true },
    select: { sellingPrice: true },
  });

const findActivePriceGlobal = ({ itemId, unitId }) =>
  prisma.itemPrice.findFirst({
    where: { itemId, unitId, branchId: null, isActive: true },
    select: { sellingPrice: true },
  });

const findTreatmentSessionsByIds = (ids) =>
  prisma.treatmentSession.findMany({
    where: { id: { in: ids } },
    select: { id: true, invoiceId: true },
  });

const findDepositsByIds = (ids) =>
  prisma.deposit.findMany({
    where: { id: { in: ids } },
    select: {
      id:         true,
      amount:     true,
      status:     true,
      customerId: true,
      invoiceDeposits: { select: { amountApplied: true } },
    },
  });

const findDepositForApply = (id) =>
  prisma.deposit.findUnique({
    where: { id },
    select: {
      id:         true,
      amount:     true,
      status:     true,
      customerId: true,
      invoiceDeposits: { select: { invoiceId: true, amountApplied: true } },
    },
  });

const findInvoiceForDepositApply = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    select: {
      id:               true,
      status:           true,
      customerId:       true,
      grandTotal:       true,
      totalDeposit:     true,
      outstandingAmount: true,
    },
  });

// ── Create ────────────────────────────────────────────────────────────

// depositsData: [{ depositId, amountApplied, newDepositStatus }]
const createWithTransaction = ({ invoiceData, itemsData, sessionIds, depositsData, userId }) =>
  prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({ data: invoiceData });

    if (itemsData.length > 0) {
      await tx.invoiceItem.createMany({
        data: itemsData.map((d) => ({ ...d, invoiceId: invoice.id })),
      });
    }

    if (sessionIds && sessionIds.length > 0) {
      await tx.treatmentSession.updateMany({
        where: { id: { in: sessionIds } },
        data:  { invoiceId: invoice.id },
      });
    }

    if (depositsData && depositsData.length > 0) {
      await tx.invoiceDeposit.createMany({
        data: depositsData.map(({ depositId, amountApplied }) => ({
          invoiceId:     invoice.id,
          depositId,
          amountApplied,
        })),
      });

      for (const { depositId, newDepositStatus } of depositsData) {
        await tx.deposit.update({
          where: { id: depositId },
          data:  { status: newDepositStatus },
        });
      }
    }

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        oldStatus: null,
        newStatus: invoiceData.status,
        notes:     "Invoice created",
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoice.id }, include: INCLUDE });
  });

// ── Apply deposit to existing invoice ────────────────────────────────

const applyDepositWithTransaction = ({
  invoiceId, depositId, amountApplied,
  newDepositStatus, newTotalDeposit, newOutstanding, newInvoiceStatus,
  oldInvoiceStatus, userId,
}) =>
  prisma.$transaction(async (tx) => {
    await tx.invoiceDeposit.create({
      data: { invoiceId, depositId, amountApplied },
    });

    await tx.deposit.update({
      where: { id: depositId },
      data:  { status: newDepositStatus },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data:  {
        totalDeposit:      newTotalDeposit,
        outstandingAmount: newOutstanding,
        status:            newInvoiceStatus,
      },
    });

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId,
        oldStatus: oldInvoiceStatus,
        newStatus: newInvoiceStatus,
        notes:     `Deposit applied: ${amountApplied}`,
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoiceId }, include: INCLUDE });
  });

// ── Update items ─────────────────────────────────────────────────────

const updateWithTransaction = ({ invoiceId, invoiceData, itemsData, oldStatus, userId }) =>
  prisma.$transaction(async (tx) => {
    // Replace all line items
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    if (itemsData.length > 0) {
      await tx.invoiceItem.createMany({
        data: itemsData.map((d) => ({ ...d, invoiceId })),
      });
    }

    await tx.invoice.update({ where: { id: invoiceId }, data: invoiceData });

    if (oldStatus !== invoiceData.status) {
      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId,
          oldStatus,
          newStatus: invoiceData.status,
          notes:     "Invoice updated",
          createdBy: userId ?? null,
        },
      });
    }

    return tx.invoice.findUnique({ where: { id: invoiceId }, include: INCLUDE });
  });

// ── Lepas deposit dari invoice (dipakai cancel & delete) ─────────────
//
// Hapus link InvoiceDeposit lalu set ulang status tiap deposit terkait.
// resolveDepositStatus(deposit) disediakan service (aturan status ada di service);
// deposit = { id, amount, status, invoiceDeposits: [{ amountApplied }] } SETELAH link dihapus.
// Return null = status tidak diubah.

const releaseInvoiceDepositsTx = async (tx, invoiceId, resolveDepositStatus) => {
  const links = await tx.invoiceDeposit.findMany({
    where:  { invoiceId },
    select: { depositId: true },
  });
  if (links.length === 0) return;

  await tx.invoiceDeposit.deleteMany({ where: { invoiceId } });

  const depositIds = [...new Set(links.map((l) => l.depositId))];
  const deposits = await tx.deposit.findMany({
    where:  { id: { in: depositIds } },
    select: { id: true, amount: true, status: true, invoiceDeposits: { select: { amountApplied: true } } },
  });

  for (const deposit of deposits) {
    const status = resolveDepositStatus(deposit);
    if (status && status !== deposit.status) {
      await tx.deposit.update({ where: { id: deposit.id }, data: { status } });
    }
  }
};

// ── Delete ────────────────────────────────────────────────────────────

const deleteWithTransaction = (invoiceId, { resolveDepositStatus } = {}) =>
  prisma.$transaction(async (tx) => {
    // Get treatment session IDs linked to this invoice
    const sessions = await tx.treatmentSession.findMany({
      where:  { invoiceId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      // Get treatment item IDs
      const tItems = await tx.treatmentItem.findMany({
        where:  { treatmentSessionId: { in: sessionIds } },
        select: { id: true },
      });
      const tItemIds = tItems.map((t) => t.id);

      if (tItemIds.length > 0) {
        // Get materialUsage IDs first
        const usages = await tx.materialUsage.findMany({
          where:  { treatmentItemId: { in: tItemIds } },
          select: { id: true },
        });
        if (usages.length > 0) {
          await tx.materialUsageItem.deleteMany({ where: { materialUsageId: { in: usages.map((u) => u.id) } } });
          await tx.materialUsage.deleteMany({ where: { id: { in: usages.map((u) => u.id) } } });
        }

        // Commission referencing TreatmentJobAssignment — harus dihapus
        // SEBELUM TreatmentJobAssignment (FK: commission → treatmentJobAssignment)
        await tx.commission.deleteMany({ where: { invoiceId } });

        // TreatmentAssignment & TreatmentJobAssignment — keduanya punya FK ke treatmentItem
        await tx.treatmentAssignment.deleteMany({ where: { treatmentItemId: { in: tItemIds } } });
        await tx.treatmentJobAssignment.deleteMany({ where: { treatmentItemId: { in: tItemIds } } });
        await tx.treatmentItem.deleteMany({ where: { id: { in: tItemIds } } });
      } else {
        // Tidak ada treatmentItem, tapi commission masih perlu dihapus
        await tx.commission.deleteMany({ where: { invoiceId } });
      }

      await tx.treatmentMedia.deleteMany({ where: { treatmentSessionId: { in: sessionIds } } });
      await tx.treatmentSession.deleteMany({ where: { id: { in: sessionIds } } });
    } else {
      // Tidak ada treatmentSession sama sekali
      await tx.commission.deleteMany({ where: { invoiceId } });
    }

    // OvertimeCharge — children dulu, baru parent
    const otCharges = await tx.overtimeCharge.findMany({
      where:  { invoiceId },
      select: { id: true },
    });
    if (otCharges.length > 0) {
      await tx.overtimeChargeEmployee.deleteMany({
        where: { overtimeChargeId: { in: otCharges.map((o) => o.id) } },
      });
      await tx.overtimeCharge.deleteMany({ where: { invoiceId } });
    }

    // ClientConsultationNote — punya FK invoiceId
    await tx.clientConsultationNote.deleteMany({ where: { invoiceId } });

    if (resolveDepositStatus) {
      await releaseInvoiceDepositsTx(tx, invoiceId, resolveDepositStatus);
    } else {
      await tx.invoiceDeposit.deleteMany({ where: { invoiceId } });
    }
    await tx.invoiceStatusHistory.deleteMany({ where: { invoiceId } });
    await tx.payment.deleteMany({ where: { invoiceId } });
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.delete({ where: { id: invoiceId } });
  });

// ── Cancel ────────────────────────────────────────────────────────────

// invoiceData: field tambahan saat batal (mis. totalDeposit / outstandingAmount)
const cancelWithTransaction = ({ invoice, userId, invoiceData = {}, resolveDepositStatus }) =>
  prisma.$transaction(async (tx) => {
    if (resolveDepositStatus) {
      await releaseInvoiceDepositsTx(tx, invoice.id, resolveDepositStatus);
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data:  { ...invoiceData, status: "CANCELLED" },
    });

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        oldStatus: invoice.status,
        newStatus: "CANCELLED",
        notes:     "Invoice cancelled",
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoice.id }, include: INCLUDE });
  });

// Jumlah pembayaran (Payment) yang tercatat untuk invoice — deposit (DP) tidak dihitung
const countPaymentsByInvoice = (invoiceId) =>
  prisma.payment.count({ where: { invoiceId } });

// Faktur sudah dihapus di Accurate (invoice batal) — lepas referensinya
const markInvoiceAccurateRemoved = (id) =>
  prisma.invoice.update({
    where: { id },
    data:  { accurateInvoiceId: null, accurateInvoiceNumber: null },
  });

// ── Commission Worksheet: single invoice with job assignments ────────
//
// `items` (InvoiceItem) is included so the service can resolve the correct
// baseAmount the same way the commission engine does:
//   baseAmount = invoiceItem.subtotal  (if matched by itemId)
//              ?? treatmentItem.priceSnapshot  (fallback)

const WORKSHEET_INCLUDE = {
  customer:    { select: { id: true, name: true } },
  commissions: { select: { id: true, status: true } },
  // InvoiceItems — needed to resolve baseAmount per treatment item
  // (price/qty/discount/taxRate untuk commissionBase rule — lihat resolveBaseAmount)
  items: { select: { id: true, itemId: true, qty: true, price: true, discount: true, subtotal: true, taxRate: true } },
  treatmentSessions: {
    include: {
      treatmentItems: {
        // All scalar fields (priceSnapshot, qty, etc.) returned automatically
        include: {
          item: {
            select: {
              id:   true, name: true, itemCode: true,
              commissionCategoryId: true,
              commissionCategory: {
                select: {
                  id: true, code: true, name: true,
                  // Field kalkulasi (chain deduction, satuan, cara bagi, tarif bawaan & tingkatan)
                  jobs: { orderBy: { sortOrder: "asc" }, select: JOB_CALC_SELECT },
                },
              },
            },
          },
          jobAssignments: {
            where:   { employeeId: { not: null }, commissionJobId: { not: null } },
            include: {
              employee:      { select: { id: true, name: true, employeeCode: true } },
              commissionJob: {
                select: {
                  id: true, name: true, jobKey: true, sortOrder: true,
                  deductsFromJobId: true,  // untuk worksheet chain calc
                  pricePerUnit:     true,
                  unit:             true,  // satuan unit
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  },
};

const findByIdForWorksheet = (id) =>
  prisma.invoice.findUnique({ where: { id }, include: WORKSHEET_INCLUDE });

module.exports = {
  findAll,
  count,
  findById,
  countToday,
  findMaxInvoiceSeqToday,
  findCustomerById,
  findAppointmentById,
  findBranchById,
  findItemById,
  findItemUnit,
  deleteWithTransaction,
  findActivePrice,
  findActivePriceGlobal,
  findTreatmentSessionsByIds,
  findDepositsByIds,
  findDepositForApply,
  findInvoiceForDepositApply,
  createWithTransaction,
  applyDepositWithTransaction,
  updateWithTransaction,
  cancelWithTransaction,
  markInvoiceAccurateRemoved,
  countPaymentsByInvoice,
  findDailyAssignment,
  findCommissionGenerateList,
  findAllPaidForJobAssignment,
  findTreatmentItemsForJobLimit,
  findByIdForWorksheet,
};
