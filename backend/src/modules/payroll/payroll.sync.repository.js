const prisma = require("../../config/prisma");

// ── Read ──────────────────────────────────────────────────────────────

/**
 * Fetch a Payroll with everything needed for Accurate Jurnal Umum sync:
 * - employee (name, code, salary settings for employer BPJS calculation)
 * - branch (accurateBranchId)
 * - payroll items (income + deduction breakdown)
 */
const findPayrollForSync = (id) =>
  prisma.payroll.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id:           true,
          name:         true,
          employeeCode: true,
          // Need latest active salary setting for employer BPJS calculation
          salarySettings: {
            where:   { isActive: true },
            orderBy: { effectiveDate: "desc" },
            take:    1,
            select: {
              bpjsJhtEmployerPercent:       true,
              bpjsJpEmployerPercent:        true,
              bpjsKesehatanEmployerPercent: true,
            },
          },
        },
      },
      branch: {
        select: { id: true, code: true, name: true, accurateBranchId: true },
      },
      items: {
        select: { type: true, category: true, label: true, amount: true },
        orderBy: [{ type: "asc" }, { category: "asc" }],
      },
    },
  });

/**
 * Fetch all payroll GL account mappings with their Accurate GL account number.
 * Returns a map: category → { glAccountId (internal), accurateGlAccountId }
 */
const findGlMappings = () =>
  prisma.payrollGlAccount.findMany({
    include: {
      glAccount: {
        select: { id: true, number: true, name: true, accurateGlAccountId: true },
      },
    },
  });

// ── Write ─────────────────────────────────────────────────────────────

/**
 * Persist the Accurate journal ID/number after successful push.
 */
const markPayrollSynced = ({ id, accurateJournalId, accurateJournalNumber }) =>
  prisma.payroll.update({
    where: { id },
    data: {
      accurateJournalId,
      accurateJournalNumber: accurateJournalNumber ?? null,
      lastSyncAt:            new Date(),
    },
  });

module.exports = { findPayrollForSync, findGlMappings, markPayrollSynced };
