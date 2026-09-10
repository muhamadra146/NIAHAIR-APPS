const prisma = require("../../config/prisma");

// ── Read ──────────────────────────────────────────────────────────────

/**
 * Fetch a Loan with all fields needed for Accurate sync.
 * Includes employee code (for Accurate lookup) and branch accurateBranchId.
 */
const findLoanForSync = (id) =>
  prisma.loan.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, name: true, employeeCode: true },
      },
      branch: {
        select: { id: true, code: true, name: true, accurateBranchId: true },
      },
    },
  });

// ── Write ─────────────────────────────────────────────────────────────

/**
 * Persist the Accurate loan ID/number after successful push.
 */
const markLoanSynced = ({ id, accurateLoanId, accurateLoanNumber }) =>
  prisma.loan.update({
    where: { id },
    data: {
      accurateLoanId,
      accurateLoanNumber: accurateLoanNumber ?? null,
      lastSyncAt:         new Date(),
    },
  });

module.exports = { findLoanForSync, markLoanSynced };
