const { accurateRequest }                                               = require("../accurate/accurate.client");
const { findPayrollForSync, findGlMappings, markPayrollSynced }         = require("./payroll.sync.repository");

// ── Accurate endpoint ─────────────────────────────────────────────────

const ACCURATE_JOURNAL_SAVE = "/general-journal/save.do";

// ── Payroll item category → GL mapping category ───────────────────────
//
// Maps each PayrollItem.category to the payrollGlAccount.category bucket.
// Items with no mapping are folded into the kas_bank balancing credit.

const INCOME_ITEM_TO_GL = {
  gaji:               "gaji",
  makan:              "tunjangan_makan",
  transport:          "tunjangan_transport",
  // Everything else → tunjangan_lain
  tunjangan:          "tunjangan_lain",
  komisi:             "tunjangan_lain",
  lembur:             "tunjangan_lain",
  libur_kerja:        "tunjangan_lain",
  service_charge_hs:  "tunjangan_lain",
  payout_cuti:        "tunjangan_lain",
};

const DEDUCTION_ITEM_TO_GL = {
  bpjs_jht:       "hutang_bpjs",
  bpjs_jp:        "hutang_bpjs",
  bpjs_kesehatan: "hutang_bpjs",
  kasbon:         "kasbon",
  // absen, terlambat, pulang_cepat: no GL mapping — absorbed into kas_bank
};

// ── Build journal lines ───────────────────────────────────────────────

/**
 * Build Accurate detailSave lines for a payroll Jurnal Umum.
 *
 * Accounting structure:
 *   DEBIT  — expense accounts per income item category + employer BPJS
 *   CREDIT — hutang_bpjs (employee BPJS deductions)
 *          — kasbon (kasbon deductions)
 *          — kas_bank (balancing: TotalDebit − hutang_bpjs − kasbon)
 *
 * The kas_bank amount = what is effectively paid out (includes absen/terlambat
 * reductions, which are netted against the expense rather than tracked separately).
 */
const buildJournalLines = (payroll, glMap) => {
  const items = payroll.items;

  // ── Aggregate income items by GL category ────────────────────────────
  const debitTotals = {};   // { glCategory: totalAmount }

  for (const item of items.filter((i) => i.type === "INCOME")) {
    const glCat = INCOME_ITEM_TO_GL[item.category];
    if (!glCat) continue;   // unmapped income items — skip (rare)
    debitTotals[glCat] = (debitTotals[glCat] ?? 0) + Number(item.amount);
  }

  // ── Employer BPJS (calculated from salary setting) ────────────────────
  const setting = payroll.employee.salarySettings?.[0];
  if (setting) {
    const baseSalary = Number(
      items.find((i) => i.type === "INCOME" && i.category === "gaji")?.amount ?? 0
    );
    if (baseSalary > 0) {
      const jhtEmp = baseSalary * Number(setting.bpjsJhtEmployerPercent       ?? 0) / 100;
      const jpEmp  = baseSalary * Number(setting.bpjsJpEmployerPercent        ?? 0) / 100;
      const kesEmp = baseSalary * Number(setting.bpjsKesehatanEmployerPercent ?? 0) / 100;
      const employerBpjs = jhtEmp + jpEmp + kesEmp;
      if (employerBpjs > 0) {
        debitTotals["bpjs_perusahaan"] = (debitTotals["bpjs_perusahaan"] ?? 0) + employerBpjs;
      }
    }
  }

  // ── Aggregate deduction items by GL category ─────────────────────────
  const creditMappedTotals = {};   // { glCategory: totalAmount } — mapped deductions only

  for (const item of items.filter((i) => i.type === "DEDUCTION")) {
    const glCat = DEDUCTION_ITEM_TO_GL[item.category];
    if (!glCat) continue;   // absen, terlambat, pulang_cepat — no GL, absorbed in kas_bank
    creditMappedTotals[glCat] = (creditMappedTotals[glCat] ?? 0) + Number(item.amount);
  }

  // ── kas_bank = balancing credit ───────────────────────────────────────
  const totalDebit  = Object.values(debitTotals).reduce((a, v) => a + v, 0);
  const totalMapped = Object.values(creditMappedTotals).reduce((a, v) => a + v, 0);
  const kasBankAmt  = totalDebit - totalMapped;

  // ── Validate GL mappings and build lines ─────────────────────────────
  const lines = [];
  const missingGl = [];

  const pushDebitLine = (glCat, amount, label) => {
    if (amount <= 0) return;
    const mapping = glMap[glCat];
    if (!mapping?.glAccount?.accurateGlAccountId) {
      missingGl.push(`DEBIT ${glCat} (${label})`);
      return;
    }
    lines.push({
      accountId:    mapping.glAccount.accurateGlAccountId,
      debitAmount:  Math.round(amount),
      creditAmount: 0,
      description:  label,
    });
  };

  const pushCreditLine = (glCat, amount, label) => {
    if (amount <= 0) return;
    const mapping = glMap[glCat];
    if (!mapping?.glAccount?.accurateGlAccountId) {
      missingGl.push(`CREDIT ${glCat} (${label})`);
      return;
    }
    lines.push({
      accountId:    mapping.glAccount.accurateGlAccountId,
      debitAmount:  0,
      creditAmount: Math.round(amount),
      description:  label,
    });
  };

  // DEBIT lines (income categories)
  if (debitTotals["gaji"]                > 0) pushDebitLine("gaji",                debitTotals["gaji"],                "Beban Gaji Pokok");
  if (debitTotals["tunjangan_makan"]     > 0) pushDebitLine("tunjangan_makan",     debitTotals["tunjangan_makan"],     "Beban Tunjangan Makan");
  if (debitTotals["tunjangan_transport"] > 0) pushDebitLine("tunjangan_transport", debitTotals["tunjangan_transport"], "Beban Tunjangan Transport");
  if (debitTotals["tunjangan_lain"]      > 0) pushDebitLine("tunjangan_lain",      debitTotals["tunjangan_lain"],      "Beban Tunjangan Lainnya");
  if (debitTotals["bpjs_perusahaan"]     > 0) pushDebitLine("bpjs_perusahaan",     debitTotals["bpjs_perusahaan"],     "Beban BPJS Perusahaan");

  // CREDIT lines (deduction categories)
  if (creditMappedTotals["hutang_bpjs"]  > 0) pushCreditLine("hutang_bpjs", creditMappedTotals["hutang_bpjs"], "Hutang BPJS Karyawan");
  if (creditMappedTotals["kasbon"]       > 0) pushCreditLine("kasbon",      creditMappedTotals["kasbon"],      "Piutang Kasbon Karyawan");

  // CREDIT kas_bank (balancing)
  if (kasBankAmt > 0) pushCreditLine("kas_bank", kasBankAmt, "Kas/Bank Pembayaran Gaji");

  return { lines, missingGl, totalDebit: Math.round(totalDebit) };
};

// ── Main sync function ────────────────────────────────────────────────

/**
 * Push a Payroll to Accurate as Jurnal Umum (General Journal).
 * Called by the SyncQueue worker when entityType = "PAYROLL".
 *
 * Idempotent: skips if accurateJournalId already set.
 * Fails with descriptive error if GL mappings or branch not configured.
 */
const syncPayrollToAccurate = async (payrollId) => {
  console.log(`[payroll sync] start payrollId=${payrollId}`);

  const payroll = await findPayrollForSync(payrollId);
  if (!payroll) throw new Error(`Payroll not found: ${payrollId}`);

  // ── Idempotency guard ────────────────────────────────────────────────
  if (payroll.accurateJournalId) {
    console.log(`[payroll sync] skip — already synced payrollId=${payrollId}`);
    return { skipped: true, reason: "Already synced" };
  }

  // ── Validation ────────────────────────────────────────────────────────
  if (payroll.status !== "PAID") {
    throw new Error(`Payroll status must be PAID to sync, got: ${payroll.status}`);
  }

  if (!payroll.branch?.accurateBranchId) {
    throw new Error(`Branch "${payroll.branch?.name}" not mapped to Accurate (accurateBranchId missing)`);
  }

  // ── Load GL mappings ──────────────────────────────────────────────────
  const glMappings = await findGlMappings();
  // Build lookup map: category → mapping record
  const glMap = Object.fromEntries(glMappings.map((m) => [m.category, m]));

  // ── Build journal lines ───────────────────────────────────────────────
  const { lines, missingGl, totalDebit } = buildJournalLines(payroll, glMap);

  if (missingGl.length > 0) {
    throw new Error(
      `GL account belum dipetakan untuk: ${missingGl.join(", ")}. ` +
      "Lengkapi mapping di Settings → Akun Gaji terlebih dahulu.",
    );
  }

  if (lines.length < 2) {
    throw new Error(`Tidak ada journal lines yang valid (${lines.length} lines). Cek payroll items.`);
  }

  // ── Build Accurate payload ────────────────────────────────────────────
  const periodLabel = new Date(payroll.periodEnd).toLocaleDateString("id-ID", {
    month: "long", year: "numeric",
  });
  const transDate = (payroll.paidAt ?? payroll.periodEnd instanceof Date
    ? payroll.paidAt ?? payroll.periodEnd
    : new Date(payroll.paidAt ?? payroll.periodEnd)
  ).toISOString().split("T")[0];

  const payload = {
    branchId:    payroll.branch.accurateBranchId,
    transDate,
    description: `Penggajian ${periodLabel} — ${payroll.employee.name}`,
    detailSave:  lines,
  };

  console.log(
    `[payroll sync] payload payrollId=${payrollId} totalDebit=${totalDebit} lines=${lines.length}`,
    JSON.stringify(payload),
  );

  // ── Call Accurate API ─────────────────────────────────────────────────
  const response = await accurateRequest(ACCURATE_JOURNAL_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateJournalId     = response.r.id;
  const accurateJournalNumber = response.r.number ?? response.r.no ?? null;

  // ── Persist Accurate IDs ──────────────────────────────────────────────
  await markPayrollSynced({ id: payrollId, accurateJournalId, accurateJournalNumber });

  console.log(
    `[payroll sync] done payrollId=${payrollId} ` +
    `accurateJournalId=${accurateJournalId} accurateJournalNumber=${accurateJournalNumber}`,
  );

  return { success: true, accurateJournalId, accurateJournalNumber };
};

module.exports = { syncPayrollToAccurate };
