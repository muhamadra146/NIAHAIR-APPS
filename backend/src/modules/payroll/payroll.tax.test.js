'use strict';

// PPh 21 (PAY-037) — contoh uji: docs/23_PPH21_PLANNING.md Bagian 4
const fs   = require('fs');
const path = require('path');
const tax  = require('./payroll.tax');

// Tarif diambil dari seed migration agar data yang benar-benar masuk database ikut teruji
const seedSql = fs.readFileSync(path.join(__dirname, '../../../prisma/migrations/20261106_pph21_setup/migration.sql'), 'utf8');
const [pasal17Brackets, terA, terB, terC] = [...seedSql.matchAll(/'(\[\{"upTo".*?\])'/g)].map((m) => JSON.parse(m[1]));
const SETTING = {
  year: 2024, ptkpSelf: '54000000', ptkpMarried: '4500000', ptkpDependent: '4500000', maxDependents: 3,
  positionCostPercent: '5', positionCostMonthlyMax: '500000',
  pasal17Brackets, terA, terB, terC,
};

const NO_EMPLOYER = { kes: 0, jkk: 0, jkm: 0 };

// Slip Dani: gaji 15 jt, iuran karyawan Kesehatan 35.000, JHT 65.000, JP 65.000
const daniItems = [
  { type: 'INCOME',    category: 'gaji',           amount: '15000000' },
  { type: 'DEDUCTION', category: 'bpjs_kesehatan', amount: '35000' },
  { type: 'DEDUCTION', category: 'bpjs_jht',       amount: '65000' },
  { type: 'DEDUCTION', category: 'bpjs_jp',        amount: '65000' },
];
const periodEndFor = (taxPeriod) => {
  // masa = bulan tanggal gajian = periodEnd + 1 hari → periodEnd = hari terakhir bulan sebelumnya
  const [y, m] = taxPeriod.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 0));
};
const dani = (taxPeriod, priorSlips = []) => tax.computePayrollTax({
  items: daniItems, employer: NO_EMPLOYER, periodEnd: periodEndFor(taxPeriod),
  ptkpStatus: 'TK0', employmentType: 'PERMANENT', resignDate: null, setting: SETTING, priorSlips,
});

describe('seed tarif', () => {
  test('jumlah baris TER A/B/C & Pasal 17', () => {
    expect([terA.length, terB.length, terC.length, pasal17Brackets.length]).toEqual([44, 40, 41, 5]);
  });

  test.each([
    ['A', 5400000, 0], ['A', 5400001, 0.25], ['A', 15100000, 6], ['A', 15100001, 7], ['A', 2000000000, 34],
    ['B', 6200000, 0], ['B', 9200000, 1], ['B', 9200001, 1.5],
    ['C', 6600000, 0], ['C', 95000001, 24], ['C', 400000000, 29],
  ])('TER %s bruto %d → %d%%', (cat, amount, rate) => {
    expect(tax.rateFor(SETTING[`ter${cat}`], amount)).toBe(rate);
  });
});

describe('contoh Dani (TK/0, gaji 15 jt, tanpa BPJS perusahaan)', () => {
  test('Januari–November: 15.000.000 × 6% = 900.000', () => {
    const r = dani('2027-01');
    expect(r).toMatchObject({ taxPeriod: '2027-01', taxGross: 15000000, taxMethod: 'TER', taxTerRate: 6, pph21: 900000 });
    expect(r.item).toEqual({ type: 'DEDUCTION', category: 'pph21', label: 'PPh 21 (TER A 6%)', amount: 900000 });
  });

  test('Desember: hitung ulang setahun = 11.766.000 − 9.900.000 = 1.866.000', () => {
    const prior = Array.from({ length: 11 }, (_, i) => ({
      taxPeriod: `2027-${String(i + 1).padStart(2, '0')}`, taxGross: '15000000', pph21: '900000', items: daniItems,
    }));
    const r = dani('2027-12', prior);
    expect(r.taxMethod).toBe('ANNUAL');
    expect(r.detail).toMatchObject({
      yearGross: 180000000, positionCost: 6000000, yearPension: 1560000,
      neto: 172440000, ptkp: 54000000, pkp: 118440000, annualTax: 11766000, withheld: 9900000, months: 12,
    });
    expect(r.pph21).toBe(1866000);
    expect(r.item).toMatchObject({ category: 'pph21', label: 'PPh 21 (hitung ulang tahunan)', amount: 1866000 });
  });
});

describe('bruto pajak', () => {
  test('penghasilan − alpha/terlambat + BPJS Kes/JKK/JKM perusahaan; kasbon & iuran karyawan diabaikan', () => {
    const items = [
      { type: 'INCOME',    category: 'gaji',      amount: '4000000' },
      { type: 'INCOME',    category: 'komisi',    amount: '1500000' },
      { type: 'INCOME',    category: 'makan',     amount: '300000' },
      { type: 'DEDUCTION', category: 'absen',     amount: '100000' },
      { type: 'DEDUCTION', category: 'terlambat', amount: '25000' },
      { type: 'DEDUCTION', category: 'kasbon',    amount: '500000' },
      { type: 'DEDUCTION', category: 'bpjs_jht',  amount: '80000' },
      { type: 'DEDUCTION', category: 'pph21',     amount: '12345' },
    ];
    expect(tax.computeTaxGross({ items, employer: { jht: 148000, jp: 80000, kes: 160000, jkk: 9600, jkm: 12000 } }))
      .toBe(4000000 + 1500000 + 300000 - 125000 + 160000 + 9600 + 12000);
  });
});

describe('ruang lingkup & status', () => {
  test('tanggal gajian sebelum 2027-01-01 → tidak dihitung', () => {
    expect(dani('2026-12')).toBeNull();
  });

  test('Gaji Desember 2026 dibayar 1 Jan 2027 → masa Januari 2027', () => {
    expect(tax.taxPeriodOf(new Date('2026-12-31'))).toBe('2027-01');
    expect(tax.isTaxable(new Date('2026-12-31'))).toBe(true);
    expect(tax.isTaxable(new Date('2026-12-30'))).toBe(false);
  });

  test('status PTKP kosong → ditandai, tanpa item', () => {
    const r = tax.computePayrollTax({ items: daniItems, employer: NO_EMPLOYER, periodEnd: periodEndFor('2027-03'), ptkpStatus: null, setting: SETTING });
    expect(r).toEqual({ missingPtkp: true, taxPeriod: '2027-03' });
  });

  test('gaji di bawah batas TER → PPh 0, tanpa item', () => {
    const r = tax.computePayrollTax({
      items: [{ type: 'INCOME', category: 'gaji', amount: '3900000' }], employer: NO_EMPLOYER,
      periodEnd: periodEndFor('2027-02'), ptkpStatus: 'TK0', setting: SETTING,
    });
    expect(r).toMatchObject({ pph21: 0, taxTerRate: 0, item: null });
  });
});

describe('PTKP & kategori', () => {
  test.each([['TK0', 54000000], ['TK3', 67500000], ['K0', 58500000], ['K3', 72000000]])('%s → %d', (s, v) => {
    expect(tax.ptkpAmount(s, SETTING)).toBe(v);
  });

  test('K/1 memakai TER B', () => {
    const r = tax.computePayrollTax({
      items: [{ type: 'INCOME', category: 'gaji', amount: '10000000' }], employer: NO_EMPLOYER,
      periodEnd: periodEndFor('2027-02'), ptkpStatus: 'K1', setting: SETTING,
    });
    expect(r).toMatchObject({ taxTerRate: 1.5, pph21: 150000 });
    expect(r.item.label).toBe('PPh 21 (TER B 1,5%)');
  });
});

describe('masa terakhir khusus', () => {
  test('resign Juni: slip terakhir hitung ulang, biaya jabatan maks 500.000 × bulan bekerja, tidak disetahunkan', () => {
    const prior = ['2027-02', '2027-03', '2027-04', '2027-05'].map((p) => ({ taxPeriod: p, taxGross: '15000000', pph21: '900000', items: daniItems }));
    const r = tax.computePayrollTax({
      items: daniItems, employer: NO_EMPLOYER, periodEnd: new Date('2027-05-31'),
      ptkpStatus: 'TK0', employmentType: 'PERMANENT', resignDate: new Date('2027-05-31'), setting: SETTING, priorSlips: prior,
    });
    // 5 masa: bruto 75 jt − 2,5 jt − 650.000 = 71.850.000 − 54 jt = 17.850.000 × 5% = 892.500 − 3.600.000
    expect(r.taxMethod).toBe('ANNUAL');
    expect(r.detail).toMatchObject({ yearGross: 75000000, positionCost: 2500000, pkp: 17850000, annualTax: 892500, withheld: 3600000 });
    expect(r.pph21).toBe(892500 - 3600000);
    expect(r.item).toEqual({ type: 'INCOME', category: 'pph21_refund', label: 'Pengembalian Lebih Potong PPh 21', amount: 2707500 });
  });

  test('pegawai tidak tetap di Desember tetap TER (tanpa hitung ulang)', () => {
    const r = tax.computePayrollTax({
      items: daniItems, employer: NO_EMPLOYER, periodEnd: periodEndFor('2027-12'),
      ptkpStatus: 'TK0', employmentType: 'NON_PERMANENT', setting: SETTING,
    });
    expect(r).toMatchObject({ taxMethod: 'TER', pph21: 900000 });
  });

  test('dua slip di masa yang sama: TER dari total bruto, dikurangi PPh slip pertama', () => {
    const r = tax.computePayrollTax({
      items: [{ type: 'INCOME', category: 'gaji', amount: '6000000' }], employer: NO_EMPLOYER,
      periodEnd: periodEndFor('2027-03'), ptkpStatus: 'TK0', setting: SETTING,
      priorSlips: [{ taxPeriod: '2027-03', taxGross: '9000000', pph21: '157500', items: [] }],
    });
    // total 15 jt × 6% = 900.000 − 157.500
    expect(r.pph21).toBe(742500);
  });
});
