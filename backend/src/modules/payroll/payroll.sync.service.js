const logger = require('../../utils/logger');
const { accurateRequest }                                               = require("../accurate/accurate.client");
const { findPayrollForSync, findGlMappings, markPayrollSynced }         = require("./payroll.sync.repository");
const { wibDateStr }                                                    = require("../../utils/date");
const { computeEmployerBpjs }                                           = require("./payroll.calc");

// ── Accurate endpoint ─────────────────────────────────────────────────
// Jurnal Umum Accurate = Journal Voucher. "/general-journal/…" ditolak Accurate ("URL API tidak tepat");
// "/journal-voucher/…" diverifikasi langsung ke Accurate (list/detail/save, 2026-10-18).

const ACCURATE_JOURNAL_SAVE = "/journal-voucher/save.do";

// ── Payroll item category → GL mapping category (Settings → Akun Gaji, 8 kategori) ──
//
// SETIAP kategori item payroll wajib punya pasangan di sini. Kategori yang tidak dikenal
// menggagalkan sinkronisasi (tidak diam-diam dilewati / dibuang ke Kas).

const INCOME_ITEM_TO_GL = {
  gaji:               "gaji",
  makan:              "tunjangan_makan",
  transport:          "tunjangan_transport",
  // Pendapatan lain → Beban Tunjangan Lainnya
  tunjangan:          "tunjangan_lain",
  komisi:             "tunjangan_lain",
  lembur:             "tunjangan_lain",
  libur_kerja:        "tunjangan_lain",
  service_charge_hs:  "tunjangan_lain",
  payout_cuti:        "tunjangan_lain",
  bonus_omset:        "tunjangan_lain",
};

// Potongan → akun yang DIKREDIT
//   absen / terlambat : uang yang tidak jadi dibayar → mengurangi Beban Gaji (kredit akun gaji)
//   BPJS karyawan     : ditahan perusahaan untuk disetor ke BPJS → Hutang BPJS
//   kasbon            : pelunasan piutang karyawan → Piutang Kasbon Karyawan
const DEDUCTION_ITEM_TO_GL = {
  absen:          "gaji",
  terlambat:      "gaji",
  bpjs_jht:       "hutang_bpjs",
  bpjs_jp:        "hutang_bpjs",
  bpjs_kesehatan: "hutang_bpjs",
  kasbon:         "kasbon",
};

const DEBIT_LABEL = {
  gaji:                "Beban Gaji Pokok",
  tunjangan_makan:     "Beban Tunjangan Makan",
  tunjangan_transport: "Beban Tunjangan Transport",
  tunjangan_lain:      "Beban Tunjangan Lainnya (tunjangan, komisi, lembur, bonus, dll.)",
  bpjs_perusahaan:     "Beban BPJS Perusahaan",
};

const CREDIT_LABEL = {
  gaji:        "Potongan Alpha / Terlambat (pengurang beban gaji)",
  hutang_bpjs: "Hutang BPJS (bagian karyawan + perusahaan)",
  kasbon:      "Potongan Kasbon (Piutang Karyawan)",
  kas_bank:    "Kas/Bank — gaji bersih dibayar",
};

const DEBIT_ORDER  = ["gaji", "tunjangan_makan", "tunjangan_transport", "tunjangan_lain", "bpjs_perusahaan"];
const CREDIT_ORDER = ["gaji", "hutang_bpjs", "kasbon"];

// Hitung dalam sen (integer) agar tidak ada galat floating point
const toCents = (v) => Math.round(Number(v ?? 0) * 100);
const centsToRupiah = (c) => Math.round(c / 100);

// "YYYY-MM-DD" → "dd/MM/yyyy" (format tanggal Accurate)
const toAccurateDate = (ymd) => {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

// ── Build journal lines ───────────────────────────────────────────────

/**
 * Susun baris Journal Voucher penggajian (satu slip).
 *
 *   DEBIT  Beban Gaji Pokok                 = item gaji
 *   DEBIT  Beban Tunjangan Makan            = item makan
 *   DEBIT  Beban Tunjangan Transport        = item transport
 *   DEBIT  Beban Tunjangan Lainnya          = tunjangan + komisi + lembur + kerja hari libur + bonus omset + payout cuti
 *   DEBIT  Beban BPJS Perusahaan            = BPJS bagian perusahaan (dari gaji pokok penuh, sama dengan Laporan BPJS)
 *   KREDIT Beban Gaji Pokok                 = potongan alpha + terlambat (gaji yang tidak jadi dibayar)
 *   KREDIT Hutang BPJS                      = BPJS bagian karyawan (potongan slip) + BPJS bagian perusahaan
 *   KREDIT Piutang Kasbon Karyawan          = potongan kasbon
 *   KREDIT Kas/Bank                         = gaji bersih yang dibayar
 *
 * Seimbang: debit = pendapatan kotor + BPJS perusahaan
 *           kredit = (alpha + terlambat + BPJS karyawan + kasbon) + BPJS perusahaan + gaji bersih
 *                  = total potongan + gaji bersih + BPJS perusahaan = pendapatan kotor + BPJS perusahaan.
 *
 * Pembulatan: setiap baris selain Kas dibulatkan ke rupiah; Kas = total debit − kredit lain sehingga
 * debit == kredit persis. Selisih Kas vs gaji bersih (dibulatkan) lebih dari pembulatan wajar → ditolak.
 *
 * @returns {{ lines, missingGl, unknownCategories, totalDebit, totalCredit, kasBank, netSalary, error }}
 */
const buildJournalLines = (payroll, glMap) => {
  const items = payroll.items ?? [];

  const debitCents  = {};
  const creditCents = {};
  const unknownCategories = [];

  for (const item of items) {
    const map = item.type === "DEDUCTION" ? DEDUCTION_ITEM_TO_GL : INCOME_ITEM_TO_GL;
    const glCat = map[item.category];
    if (!glCat) {
      unknownCategories.push(`${item.type === "DEDUCTION" ? "potongan" : "pendapatan"} "${item.label ?? item.category}" (${item.category})`);
      continue;
    }
    const bucket = item.type === "DEDUCTION" ? creditCents : debitCents;
    bucket[glCat] = (bucket[glCat] ?? 0) + toCents(item.amount);
  }

  // BPJS perusahaan: beban perusahaan (debit) dan utang ke BPJS (kredit) — tidak memengaruhi Kas
  const employer = computeEmployerBpjs({ items, setting: payroll.employee?.salarySettings?.[0] ?? null });
  if (employer.total > 0) {
    debitCents.bpjs_perusahaan = (debitCents.bpjs_perusahaan ?? 0) + employer.total * 100;
    creditCents.hutang_bpjs    = (creditCents.hutang_bpjs    ?? 0) + employer.total * 100;
  }

  // Bulatkan per baris (rupiah penuh)
  const debit  = Object.fromEntries(DEBIT_ORDER.map((k) => [k, centsToRupiah(debitCents[k] ?? 0)]));
  const credit = Object.fromEntries(CREDIT_ORDER.map((k) => [k, centsToRupiah(creditCents[k] ?? 0)]));

  const totalDebit       = Object.values(debit).reduce((a, v) => a + v, 0);
  const otherCreditTotal = Object.values(credit).reduce((a, v) => a + v, 0);
  const kasBank          = totalDebit - otherCreditTotal;
  const netSalary        = centsToRupiah(toCents(payroll.netSalary));

  let error = null;
  // Selisih pembulatan maksimal ±1 rupiah per baris yang dibulatkan
  const tolerance = DEBIT_ORDER.length + CREDIT_ORDER.length;
  if (kasBank < 0) {
    error = `Gaji bersih minus (${kasBank}); payroll tidak bisa dijurnal`;
  } else if (payroll.netSalary != null && Math.abs(kasBank - netSalary) > tolerance) {
    error = `Kas/Bank jurnal (${kasBank}) tidak sama dengan gaji bersih slip (${netSalary}). Periksa item payroll.`;
  }

  const lines = [];
  const missingGl = [];

  const pushLine = (glCat, amount, amountType, memo) => {
    if (amount <= 0) return;
    const accountNo = glMap[glCat]?.glAccount?.number;
    if (!accountNo) {
      missingGl.push(`${amountType} ${glCat} (${memo})`);
      return;
    }
    lines.push({ accountNo, amount, amountType, memo });
  };

  for (const k of DEBIT_ORDER)  pushLine(k, debit[k],  "DEBIT",  DEBIT_LABEL[k]);
  for (const k of CREDIT_ORDER) pushLine(k, credit[k], "CREDIT", CREDIT_LABEL[k]);
  pushLine("kas_bank", kasBank, "CREDIT", CREDIT_LABEL.kas_bank);

  const totalCredit = otherCreditTotal + kasBank;
  return { lines, missingGl, unknownCategories, totalDebit, totalCredit, kasBank, netSalary, error };
};

// ── Main sync function ────────────────────────────────────────────────

/**
 * Push a Payroll to Accurate as Journal Voucher (Jurnal Umum).
 * Called by the SyncQueue worker when entityType = "PAYROLL".
 *
 * Idempotent: skips if accurateJournalId already set.
 * Fails with descriptive error if GL mappings or branch not configured.
 */
const syncPayrollToAccurate = async (payrollId) => {
  logger.info(`[payroll sync] start payrollId=${payrollId}`);

  const payroll = await findPayrollForSync(payrollId);
  if (!payroll) throw new Error(`Payroll tidak ditemukan: ${payrollId}`);

  // ── Idempotency guard ────────────────────────────────────────────────
  if (payroll.accurateJournalId) {
    logger.info(`[payroll sync] skip — already synced payrollId=${payrollId}`);
    return { skipped: true, reason: "Already synced" };
  }

  // ── Validation ────────────────────────────────────────────────────────
  if (payroll.status !== "PAID") {
    throw new Error(`Payroll harus berstatus PAID untuk dijurnal, status sekarang: ${payroll.status}`);
  }

  if (!payroll.branch?.accurateBranchId) {
    throw new Error(`Cabang "${payroll.branch?.name}" belum terhubung ke Accurate (accurateBranchId kosong)`);
  }

  // ── Load GL mappings ──────────────────────────────────────────────────
  const glMappings = await findGlMappings();
  const glMap = Object.fromEntries(glMappings.map((m) => [m.category, m]));

  // ── Build journal lines ───────────────────────────────────────────────
  const { lines, missingGl, unknownCategories, totalDebit, totalCredit, error } = buildJournalLines(payroll, glMap);

  if (unknownCategories.length > 0) {
    throw new Error(`Item payroll belum punya akun GL: ${unknownCategories.join(", ")}.`);
  }

  if (missingGl.length > 0) {
    throw new Error(
      `Akun GL belum dipetakan untuk: ${missingGl.join(", ")}. ` +
      "Lengkapi mapping di Settings → Akun Gaji terlebih dahulu.",
    );
  }

  if (error) throw new Error(error);

  if (totalDebit !== totalCredit) {
    throw new Error(`Jurnal tidak seimbang: debit ${totalDebit} ≠ kredit ${totalCredit}`);
  }

  if (lines.length < 2) {
    throw new Error(`Tidak ada baris jurnal yang valid (${lines.length} baris). Cek item payroll.`);
  }

  // ── Build Accurate payload ────────────────────────────────────────────
  // Nama bulan gaji = bulan kerja (bulan mulai periode), mis. 7 Okt–6 Nov → "Oktober 2026"
  const periodLabel = new Date(payroll.periodStart).toLocaleDateString("id-ID", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  // Tanggal transaksi = tanggal bayar menurut kalender WIB (paidAt = timestamp, periodEnd = @db.Date)
  const transDate = toAccurateDate(wibDateStr(payroll.paidAt ?? payroll.periodEnd));
  const code = payroll.employee.employeeCode ? ` (${payroll.employee.employeeCode})` : "";

  const payload = {
    branchId:    payroll.branch.accurateBranchId,
    transDate,
    description: `Penggajian ${periodLabel} — ${payroll.employee.name}${code}`,
    detailJournalVoucher: lines,
  };

  logger.info(
    `[payroll sync] payload payrollId=${payrollId} totalDebit=${totalDebit} lines=${lines.length}`,
    JSON.stringify(payload),
  );

  // ── Call Accurate API ─────────────────────────────────────────────────
  const response = await accurateRequest(ACCURATE_JOURNAL_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response?.s || !response.r?.id) {
    const msg = Array.isArray(response?.d) ? response.d.join("; ") : JSON.stringify(response);
    // Akun induk (header) tidak bisa dijurnal di Accurate → arahkan ke pengaturan pemetaan
    const hint = /induk/i.test(msg)
      ? " Ganti pemetaan di Settings → Akun Gaji ke akun anak (bukan akun induk), lalu klik Coba lagi."
      : "";
    throw new Error(`Accurate menolak jurnal: ${msg}.${hint}`);
  }

  const accurateJournalId     = String(response.r.id);
  const accurateJournalNumber = response.r.number ?? response.r.no ?? null;

  // ── Persist Accurate IDs ──────────────────────────────────────────────
  await markPayrollSynced({ id: payrollId, accurateJournalId, accurateJournalNumber });

  logger.info(
    `[payroll sync] done payrollId=${payrollId} ` +
    `accurateJournalId=${accurateJournalId} accurateJournalNumber=${accurateJournalNumber}`,
  );

  return { success: true, accurateJournalId, accurateJournalNumber };
};

module.exports = { syncPayrollToAccurate, buildJournalLines, INCOME_ITEM_TO_GL, DEDUCTION_ITEM_TO_GL };
