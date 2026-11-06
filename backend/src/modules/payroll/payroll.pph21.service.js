const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const repo = require("./payroll.repository");
const { computeEmployerBpjs } = require("./payroll.calc");
const {
  PPH21_START_DATE, PTKP_LABEL, TAX_ITEM_CATEGORIES,
  computeTaxGross, computeTerTax, computeAnnualTax, employeePensionContribution,
} = require("./payroll.tax");

// ── Laporan PPh 21 / bahan e-Bupot Coretax (PAY-037) ──────────────────
//   Bulanan  : bukti potong bulanan (BPMP pegawai tetap / BP21 tidak tetap) per masa pajak
//   Tahunan  : bukti potong A1 (masa terakhir: Desember / resign) dengan rincian hitung ulang
//   Simulasi : masa sebelum PPh 21 berlaku (uji coba berdampingan) — dihitung saat itu, tidak disimpan

const DAY_MS = 24 * 60 * 60 * 1000;
const START_PERIOD = PPH21_START_DATE.slice(0, 7);

// Kode objek pajak e-Bupot 21
const TAX_OBJECT_CODE = {
  PERMANENT:     "21-100-01", // penghasilan pegawai tetap
  NON_PERMANENT: "21-100-03", // upah pegawai tidak tetap
};

const num = (v) => Number(v ?? 0);
const round2 = (n) => Math.round(n * 100) / 100;
const payDateOf = (periodEnd) => new Date(new Date(periodEnd).getTime() + DAY_MS).toISOString().slice(0, 10);

const assertTaxPeriod = (taxPeriod) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(taxPeriod ?? "")) {
    throw new AppError("Masa pajak harus format YYYY-MM", StatusCodes.BAD_REQUEST);
  }
};

const employeeOf = (p) => ({
  id:           p.employee.id,
  name:         p.employee.name,
  employeeCode: p.employee.employeeCode,
  nikKtp:       p.employee.nikKtp,
  position:     p.employee.role?.name ?? null,
});

const groupByEmployee = (payrolls) => {
  const map = new Map();
  for (const p of payrolls) {
    if (!map.has(p.employee.id)) map.set(p.employee.id, []);
    map.get(p.employee.id).push(p);
  }
  return [...map.values()];
};

const sumTotals = (rows) => ({
  gross: round2(rows.reduce((s, r) => s + r.gross, 0)),
  pph21: round2(rows.reduce((s, r) => s + r.pph21, 0)),
});

/** Masa yang sudah berlaku: angka PPh 21 tersimpan di slip disetujui/dibayar */
const monthlyActual = async ({ taxPeriod, branchId }) => {
  const payrolls = await repo.findPph21ReportData({ taxPeriodPrefix: taxPeriod, branchId });

  const rows = groupByEmployee(payrolls).map((slips) => {
    const last  = slips[slips.length - 1];
    const final = slips.some((s) => s.taxMethod === "ANNUAL");
    const type  = last.employee.taxEmploymentType ?? "PERMANENT";
    return {
      employee:        employeeOf(last),
      ptkpStatus:      last.taxPtkpStatus,
      ptkpLabel:       PTKP_LABEL[last.taxPtkpStatus] ?? null,
      employmentType:  type,
      taxObjectCode:   TAX_OBJECT_CODE[type],
      // Masa terakhir dilaporkan lewat bukti potong A1, bukan bukti potong bulanan
      document:        final ? "A1" : type === "PERMANENT" ? "BPMP" : "BP21",
      method:          final ? "ANNUAL" : "TER",
      terRate:         final ? null : num(last.taxTerRate),
      gross:           round2(slips.reduce((s, p) => s + num(p.taxGross), 0)),
      pph21:           round2(slips.reduce((s, p) => s + num(p.pph21), 0)),
      withholdingDate: payDateOf(last.periodEnd),
      slipCount:       slips.length,
      statuses:        [...new Set(slips.map((s) => s.status))],
      missingPtkp:     false,
    };
  });

  return { mode: "ACTUAL", taxPeriod, data: rows, totals: sumTotals(rows) };
};

/**
 * Simulasi uji coba (masa sebelum 2027-01): slip dengan tanggal gajian di bulan itu (semua status),
 * PPh 21 dihitung dengan TER memakai status PTKP karyawan saat ini. Tidak menyimpan apa pun.
 * Masa terakhir tidak disimulasikan (data Januari–November tahun itu tidak ada di aplikasi).
 */
const monthlySimulation = async ({ taxPeriod, branchId }) => {
  const [y, m] = taxPeriod.split("-").map(Number);
  const firstPayDay = Date.UTC(y, m - 1, 1);
  const lastPayDay  = Date.UTC(y, m, 0);
  const [payrolls, setting] = await Promise.all([
    repo.findPayrollsByPayDate({
      periodEndFrom: new Date(firstPayDay - DAY_MS),
      periodEndTo:   new Date(lastPayDay - DAY_MS),
      branchId,
    }),
    repo.findTaxSetting(y),
  ]);
  if (!setting) throw new AppError(`Tarif PPh 21 tahun ${y} belum diatur`, StatusCodes.UNPROCESSABLE_ENTITY);

  const rows = groupByEmployee(payrolls).map((slips) => {
    const last = slips[slips.length - 1];
    const type = last.employee.taxEmploymentType ?? "PERMANENT";
    const ptkp = last.employee.ptkpStatus ?? null;
    const gross = round2(slips.reduce((s, p) => s + computeTaxGross({
      items:    p.items,
      employer: computeEmployerBpjs({ items: p.items, setting: p.employee.salarySettings?.[0] ?? null }),
    }), 0));
    const ter = ptkp ? computeTerTax({ gross, ptkpStatus: ptkp, setting }) : null;
    return {
      employee:        employeeOf(last),
      ptkpStatus:      ptkp,
      ptkpLabel:       PTKP_LABEL[ptkp] ?? null,
      employmentType:  type,
      taxObjectCode:   TAX_OBJECT_CODE[type],
      document:        type === "PERMANENT" ? "BPMP" : "BP21",
      method:          "TER",
      terRate:         ter?.rate ?? null,
      gross,
      pph21:           ter?.pph21 ?? 0,
      withholdingDate: payDateOf(last.periodEnd),
      slipCount:       slips.length,
      statuses:        [...new Set(slips.map((s) => s.status))],
      missingPtkp:     !ptkp,
    };
  });

  return { mode: "SIMULATION", taxPeriod, data: rows, totals: sumTotals(rows) };
};

const getMonthlyReport = async ({ taxPeriod, branchId }) => {
  assertTaxPeriod(taxPeriod);
  return taxPeriod < START_PERIOD
    ? monthlySimulation({ taxPeriod, branchId })
    : monthlyActual({ taxPeriod, branchId });
};

// ── Bukti potong A1 ────────────────────────────────────────────────────

// Kategori item penghasilan → baris A1
const A1_LINE = {
  gaji:        "salary",
  bonus_omset: "bonus",
  payout_cuti: "bonus",
};

/** Rincian penghasilan bruto A1 dari item slip (alpha/terlambat mengurangi gaji; premi = BPJS perusahaan yang masuk bruto) */
const a1Lines = (slips) => {
  const lines = { salary: 0, otherAllowance: 0, insurancePremium: 0, bonus: 0 };
  for (const p of slips) {
    let netIncome = 0;
    for (const i of p.items) {
      if (TAX_ITEM_CATEGORIES.includes(i.category)) continue;
      const amount = num(i.amount);
      if (i.type === "DEDUCTION") {
        if (i.category === "absen" || i.category === "terlambat") { lines.salary -= amount; netIncome -= amount; }
        continue;
      }
      lines[A1_LINE[i.category] ?? "otherAllowance"] += amount;
      netIncome += amount;
    }
    lines.insurancePremium += num(p.taxGross) - netIncome;
  }
  return Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, round2(v)]));
};

const getAnnualReport = async ({ year, branchId }) => {
  if (!/^\d{4}$/.test(String(year ?? ""))) throw new AppError("Tahun pajak harus format YYYY", StatusCodes.BAD_REQUEST);
  const [payrolls, setting] = await Promise.all([
    repo.findPph21ReportData({ taxPeriodPrefix: `${year}-`, branchId }),
    repo.findTaxSetting(Number(year)),
  ]);

  const rows = [];
  for (const slips of groupByEmployee(payrolls)) {
    const finalSlip = [...slips].reverse().find((s) => s.taxMethod === "ANNUAL");
    if (!finalSlip || !setting) continue;
    const used   = slips.filter((s) => s.taxPeriod <= finalSlip.taxPeriod);
    const priors = used.filter((s) => s.id !== finalSlip.id);

    const calc = computeAnnualTax({
      gross:      num(finalSlip.taxGross),
      pension:    employeePensionContribution(finalSlip.items),
      ptkpStatus: finalSlip.taxPtkpStatus,
      setting,
      priorSlips: priors,
      taxPeriod:  finalSlip.taxPeriod,
    }).detail;

    rows.push({
      employee:      employeeOf(finalSlip),
      ptkpStatus:    finalSlip.taxPtkpStatus,
      ptkpLabel:     PTKP_LABEL[finalSlip.taxPtkpStatus] ?? null,
      taxObjectCode: TAX_OBJECT_CODE.PERMANENT,
      periodFrom:    used[0].taxPeriod,
      periodTo:      finalSlip.taxPeriod,
      lines:         a1Lines(used),
      gross:         round2(calc.yearGross),
      positionCost:  round2(calc.positionCost),
      pension:       round2(calc.yearPension),
      neto:          round2(calc.neto),
      ptkp:          calc.ptkp,
      pkp:           calc.pkp,
      annualTax:     calc.annualTax,
      withheldBefore: round2(calc.withheld),
      // PPh masa terakhir yang tersimpan di slip (minus = lebih potong dikembalikan)
      finalPeriodTax: num(finalSlip.pph21),
    });
  }

  const totals = {
    gross:     round2(rows.reduce((s, r) => s + r.gross, 0)),
    annualTax: rows.reduce((s, r) => s + r.annualTax, 0),
  };
  return { year: Number(year), data: rows, totals };
};

module.exports = { getMonthlyReport, getAnnualReport, TAX_OBJECT_CODE };
