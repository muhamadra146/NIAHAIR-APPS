'use strict';

// 5 contoh kasus PPh 21 satu tahun pajak penuh (masa Januari–Desember 2027) — PAY-037.
// Angka harapan dihitung manual; rincian di docs/23_PPH21_PLANNING.md Bagian 7.
const fs   = require('fs');
const path = require('path');
const tax  = require('./payroll.tax');
const { computeEmployerBpjs } = require('./payroll.calc');

const seedSql = fs.readFileSync(path.join(__dirname, '../../../prisma/migrations/20261106_pph21_setup/migration.sql'), 'utf8');
const [pasal17Brackets, terA, terB, terC] = [...seedSql.matchAll(/'(\[\{"upTo".*?\])'/g)].map((m) => JSON.parse(m[1]));
const SETTING = {
  year: 2024, ptkpSelf: '54000000', ptkpMarried: '4500000', ptkpDependent: '4500000', maxDependents: 3,
  positionCostPercent: '5', positionCostMonthlyMax: '500000', pasal17Brackets, terA, terB, terC,
};

const MASA = Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, '0')}`);
// masa = bulan tanggal gajian (payDay 1) → akhir periode = hari terakhir bulan sebelumnya
const periodEndOf = (taxPeriod) => {
  const [y, m] = taxPeriod.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 0));
};

/** Item slip seperti buatan payroll: gaji + tunjangan, iuran BPJS karyawan dari gaji pokok */
const slipItems = ({ salary, tunjangan = 0, jht = 2, jp = 1, kes = 0 }) => [
  { type: 'INCOME', category: 'gaji', amount: String(salary), quantity: null },
  ...(tunjangan ? [{ type: 'INCOME', category: 'tunjangan', amount: String(tunjangan) }] : []),
  { type: 'DEDUCTION', category: 'bpjs_jht', amount: String(salary * jht / 100) },
  { type: 'DEDUCTION', category: 'bpjs_jp',  amount: String(salary * jp / 100) },
  ...(kes ? [{ type: 'DEDUCTION', category: 'bpjs_kesehatan', amount: String(salary * kes / 100) }] : []),
];

/** Jalankan satu tahun: tiap masa memakai slip-slip sebelumnya seperti di payroll */
const runYear = ({ ptkp, type = 'PERMANENT', masa, slipFor, employer = {}, resignDate = null }) => {
  const prior = [];
  return masa.map((taxPeriod) => {
    const items = slipFor(taxPeriod);
    const r = tax.computePayrollTax({
      items,
      employer:       computeEmployerBpjs({ items, setting: { baseSalary: items[0].amount, ...employer } }),
      periodEnd:      periodEndOf(taxPeriod),
      ptkpStatus:     ptkp,
      employmentType: type,
      resignDate,
      setting:        SETTING,
      priorSlips:     prior,
    });
    prior.push({ taxPeriod, taxGross: r.taxGross, pph21: r.pph21, items });
    return r;
  });
};

const sum = (rs) => rs.reduce((s, r) => s + r.pph21, 0);

describe('Kasus 1 — RINA: TK/0, gaji 5 jt (di bawah batas TER)', () => {
  const rs = runYear({ ptkp: 'TK0', masa: MASA, slipFor: () => slipItems({ salary: 5000000 }) });

  test('Januari–November: TER A 0% → Rp0', () => {
    rs.slice(0, 11).forEach((r) => expect(r).toMatchObject({ taxMethod: 'TER', taxTerRate: 0, pph21: 0 }));
  });
  test('Desember: bruto 60 jt − 3 jt − 1,8 jt = 55,2 jt − PTKP 54 jt = PKP 1,2 jt × 5% = 60.000', () => {
    expect(rs[11].taxMethod).toBe('ANNUAL');
    expect(rs[11].detail).toMatchObject({ yearGross: 60000000, positionCost: 3000000, yearPension: 1800000, neto: 55200000, pkp: 1200000, annualTax: 60000, withheld: 0 });
    expect(rs[11].pph21).toBe(60000);
  });
});

describe('Kasus 2 — BUDI: K/1, gaji 10 jt + tunjangan 1,5 jt, BPJS perusahaan', () => {
  // Perusahaan: Kes 4% + JKK 0,24% + JKM 0,3% masuk bruto; JHT 3,7% & JP 2% tidak
  const employer = { bpjsJhtEmployerPercent: 3.7, bpjsJpEmployerPercent: 2, bpjsKesehatanEmployerPercent: 4, bpjsJkkEmployerPercent: 0.24, bpjsJkmEmployerPercent: 0.3 };
  const rs = runYear({ ptkp: 'K1', masa: MASA, employer, slipFor: () => slipItems({ salary: 10000000, tunjangan: 1500000, kes: 1 }) });

  test('bruto per bulan = 11,5 jt + 400.000 + 24.000 + 30.000 = 11.954.000 → TER B 3% = 358.620', () => {
    rs.slice(0, 11).forEach((r) => expect(r).toMatchObject({ taxGross: 11954000, taxTerRate: 3, pph21: 358620 }));
  });
  test('Desember: PPh setahun 4.627.200 − 3.944.820 = 682.380', () => {
    expect(rs[11].detail).toMatchObject({
      yearGross: 143448000, positionCost: 6000000, yearPension: 3600000, neto: 133848000,
      ptkp: 63000000, pkp: 70848000, annualTax: 4627200, withheld: 3944820,
    });
    expect(rs[11].pph21).toBe(682380);
    expect(sum(rs)).toBe(4627200);
  });
});

describe('Kasus 3 — CITRA: K/3, gaji 25 jt naik jadi 30 jt mulai masa Juli', () => {
  const rs = runYear({ ptkp: 'K3', masa: MASA, slipFor: (p) => slipItems({ salary: p < '2027-07' ? 25000000 : 30000000 }) });

  test('masa Januari–Juni: TER C 9% × 25 jt = 2.250.000', () => {
    rs.slice(0, 6).forEach((r) => expect(r).toMatchObject({ taxTerRate: 9, pph21: 2250000 }));
  });
  test('masa Juli–November: TER C 11% × 30 jt = 3.300.000', () => {
    rs.slice(6, 11).forEach((r) => expect(r).toMatchObject({ taxTerRate: 11, pph21: 3300000 }));
  });
  test('Desember: PPh setahun 30.315.000 − 30.000.000 = 315.000', () => {
    expect(rs[11].detail).toMatchObject({
      yearGross: 330000000, positionCost: 6000000, yearPension: 9900000, neto: 314100000,
      ptkp: 72000000, pkp: 242100000, annualTax: 30315000, withheld: 30000000,
    });
    expect(rs[11].pph21).toBe(315000);
  });
});

describe('Kasus 4 — DEDI: TK/2, masuk 1 April 2027, gaji 9 jt (8 masa)', () => {
  const rs = runYear({ ptkp: 'TK2', masa: MASA.slice(4), slipFor: () => slipItems({ salary: 9000000 }) });

  test('masa Mei–November: TER B 1% = 90.000', () => {
    rs.slice(0, 7).forEach((r) => expect(r).toMatchObject({ taxTerRate: 1, pph21: 90000 }));
  });
  test('Desember: tidak disetahunkan, biaya jabatan maks 500.000 × 8; lebih potong 468.000 dikembalikan', () => {
    expect(rs[7].detail).toMatchObject({
      yearGross: 72000000, positionCost: 3600000, yearPension: 2160000, neto: 66240000,
      ptkp: 63000000, pkp: 3240000, annualTax: 162000, withheld: 630000, months: 8,
    });
    expect(rs[7].pph21).toBe(-468000);
    expect(rs[7].item).toMatchObject({ type: 'INCOME', category: 'pph21_refund', amount: 468000 });
  });
});

describe('Kasus 5 — EKA: TK/0 pegawai tidak tetap, gaji 7 jt', () => {
  const rs = runYear({ ptkp: 'TK0', type: 'NON_PERMANENT', masa: MASA, slipFor: () => slipItems({ salary: 7000000 }) });

  test('semua masa termasuk Desember: TER A 1,25% = 87.500, tanpa hitung ulang', () => {
    rs.forEach((r) => expect(r).toMatchObject({ taxMethod: 'TER', taxTerRate: 1.25, pph21: 87500 }));
    expect(sum(rs)).toBe(1050000);
  });
});
