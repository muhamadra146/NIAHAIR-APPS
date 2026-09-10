const { accurateRequest }               = require("../accurate/accurate.client");
const { findLoanForSync, markLoanSynced } = require("./loan.sync.repository");

// ── Accurate endpoints ────────────────────────────────────────────────

const ACCURATE_EMPLOYEE_LOAN_SAVE = "/employee-loan/save.do";
const ACCURATE_EMPLOYEE_LIST      = "/employee/list.do";

// ── Helper: look up Accurate employee by employee code ────────────────

/**
 * Search Accurate's employee list for a record with matching employeeNo.
 * Returns the Accurate internal employee ID, or null if not found.
 *
 * Employees are NOT synced from ERP → Accurate; HR manually registers
 * them in Accurate. This lookup bridges the two systems.
 */
const findAccurateEmployeeId = async (employeeCode) => {
  const url = `${ACCURATE_EMPLOYEE_LIST}?fields=id,employeeNo,name&filter.employeeNo=${encodeURIComponent(employeeCode)}&sp.limit=1`;

  const res = await accurateRequest(url, { method: "GET" });

  // Accurate list responses use res.d as the data array
  if (!res.s) {
    throw new Error(`Accurate employee search error: ${JSON.stringify(res)}`);
  }

  const list = res.d ?? [];
  if (list.length === 0) return null;

  return list[0].id;
};

// ── Main sync function ────────────────────────────────────────────────

/**
 * Push a Kasbon (Loan) to Accurate as Pinjaman Karyawan.
 * Called by the SyncQueue worker when entityType = "LOAN".
 *
 * Idempotent: skips if accurateLoanId already set.
 * Fails with descriptive error if branch or employee not mapped.
 */
const syncLoanToAccurate = async (loanId) => {
  console.log(`[loan sync] start loanId=${loanId}`);

  const loan = await findLoanForSync(loanId);
  if (!loan) throw new Error(`Loan not found: ${loanId}`);

  // ── Idempotency guard ────────────────────────────────────────────────
  if (loan.accurateLoanId) {
    console.log(`[loan sync] skip — already synced loanId=${loanId}`);
    return { skipped: true, reason: "Already synced" };
  }

  // ── Validation ────────────────────────────────────────────────────────
  if (loan.status !== "ACTIVE") {
    throw new Error(`Loan status must be ACTIVE to sync, got: ${loan.status}`);
  }

  if (!loan.branch?.accurateBranchId) {
    throw new Error(`Branch "${loan.branch?.name}" not mapped to Accurate (accurateBranchId missing)`);
  }

  if (!loan.employee?.employeeCode) {
    throw new Error(`Employee "${loan.employee?.name}" has no employee code — cannot look up in Accurate`);
  }

  // ── Look up Accurate employee ID ─────────────────────────────────────
  const accurateEmployeeId = await findAccurateEmployeeId(loan.employee.employeeCode);
  if (!accurateEmployeeId) {
    throw new Error(
      `Employee with code "${loan.employee.employeeCode}" not found in Accurate. ` +
      "Please manually register the employee in Accurate first.",
    );
  }

  // ── Build payload ─────────────────────────────────────────────────────
  const transDate = loan.startDate instanceof Date
    ? loan.startDate.toISOString().split("T")[0]
    : String(loan.startDate).split("T")[0];

  const payload = {
    branchId:    loan.branch.accurateBranchId,
    employeeId:  accurateEmployeeId,
    no:          loan.loanNo,
    transDate,
    amount:      Number(loan.totalAmount),
    description: loan.notes ?? `Kasbon ${loan.employee.name} - ${loan.loanNo}`,
  };

  console.log(`[loan sync] payload loanId=${loanId}`, JSON.stringify(payload));

  // ── Call Accurate API ─────────────────────────────────────────────────
  const response = await accurateRequest(ACCURATE_EMPLOYEE_LOAN_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateLoanId     = response.r.id;
  const accurateLoanNumber = response.r.number ?? response.r.no ?? null;

  // ── Persist Accurate IDs ──────────────────────────────────────────────
  await markLoanSynced({ id: loanId, accurateLoanId, accurateLoanNumber });

  console.log(
    `[loan sync] done loanId=${loanId} ` +
    `accurateLoanId=${accurateLoanId} accurateLoanNumber=${accurateLoanNumber}`,
  );

  return { success: true, accurateLoanId, accurateLoanNumber };
};

module.exports = { syncLoanToAccurate };
