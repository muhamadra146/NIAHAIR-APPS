'use strict';

// QA 2026-10-18 — Jurnal penggajian Accurate (Journal Voucher):
//   · endpoint /journal-voucher/save.do (bukan /general-journal → "URL API tidak tepat")
//   · Kas/Bank = gaji bersih; alpha/terlambat mengurangi Beban Gaji; BPJS perusahaan dari gaji pokok penuh
//     dan dikredit ke Hutang BPJS; semua kategori item punya akun; debit == kredit persis
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./payroll.sync.repository', () => ({
  findPayrollForSync: jest.fn(), findGlMappings: jest.fn(), markPayrollSynced: jest.fn(),
}));

const { accurateRequest } = require('../accurate/accurate.client');
const syncRepo = require('./payroll.sync.repository');
const { buildJournalLines, syncPayrollToAccurate, INCOME_ITEM_TO_GL, DEDUCTION_ITEM_TO_GL } = require('./payroll.sync.service');
const { DEFAULT_MAPPINGS_FOR_TEST } = (() => ({
  DEFAULT_MAPPINGS_FOR_TEST: ['gaji', 'tunjangan_makan', 'tunjangan_transport', 'tunjangan_lain', 'bpjs_perusahaan', 'hutang_bpjs', 'kasbon', 'kas_bank'],
}))();

const NO = {
  gaji: '610101', tunjangan_makan: '600007', tunjangan_transport: '600006', tunjangan_lain: '600005',
  bpjs_perusahaan: '60000403', hutang_bpjs: '210401', kasbon: '110509', kas_bank: '110101',
};
const MAPPINGS = Object.entries(NO).map(([category, number]) => ({ category, glAccount: { number, accurateGlAccountId: 1 } }));
const GL_MAP = Object.fromEntries(MAPPINGS.map((m) => [m.category, m]));

const SETTING = { baseSalary: '3000000', bpjsJhtEmployerPercent: '3.7', bpjsJpEmployerPercent: '2', bpjsKesehatanEmployerPercent: '4' };

const item = (type, category, amount, extra = {}) => ({ type, category, label: category, amount: String(amount), quantity: null, ...extra });

// Slip nyata Oktober 2026 (STAFF OP) — angka tidak diubah
const OCTOBER = {
  id: 'pr-oct', status: 'PAID', netSalary: '2853333.33',
  periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-31'), paidAt: new Date('2026-10-04T10:08:14.954Z'),
  employee: { name: 'STAFF OP', employeeCode: 'EMP006', salarySettings: [SETTING] },
  branch: { name: 'NIAHAIR', accurateBranchId: 50 },
  accurateJournalId: null,
  items: [
    item('INCOME', 'gaji', 3000000), item('INCOME', 'makan', 40000), item('INCOME', 'transport', '33333.33'), item('INCOME', 'komisi', 50000),
    item('DEDUCTION', 'terlambat', 50000), item('DEDUCTION', 'bpjs_jht', 60000), item('DEDUCTION', 'bpjs_jp', 30000),
    item('DEDUCTION', 'bpjs_kesehatan', 30000), item('DEDUCTION', 'kasbon', 100000),
  ],
};

const sum = (lines, type) => lines.filter((l) => l.amountType === type).reduce((a, l) => a + l.amount, 0);
const line = (lines, accountNo, type) => lines.find((l) => l.accountNo === accountNo && l.amountType === type);

beforeEach(() => jest.clearAllMocks());

describe('buildJournalLines', () => {
  test('slip Oktober: seimbang, Kas = gaji bersih, BPJS perusahaan ke Hutang BPJS, terlambat kredit Beban Gaji', () => {
    const r = buildJournalLines(OCTOBER, GL_MAP);
    expect(r.error).toBeNull();
    expect(r.unknownCategories).toEqual([]);
    expect(r.lines.map((l) => [l.amountType, l.accountNo, l.amount])).toEqual([
      ['DEBIT',  '610101',   3000000],
      ['DEBIT',  '600007',   40000],
      ['DEBIT',  '600006',   33333],
      ['DEBIT',  '600005',   50000],
      ['DEBIT',  '60000403', 291000],   // 3,7% + 2% + 4% × 3.000.000
      ['CREDIT', '610101',   50000],    // potongan terlambat mengurangi Beban Gaji
      ['CREDIT', '210401',   411000],   // BPJS karyawan 120.000 + perusahaan 291.000
      ['CREDIT', '110509',   100000],   // kasbon
      ['CREDIT', '110101',   2853333],  // Kas = gaji bersih
    ]);
    expect(sum(r.lines, 'DEBIT')).toBe(sum(r.lines, 'CREDIT'));
    expect(r.totalDebit).toBe(3414333);
  });

  test('alpha juga dikredit ke Beban Gaji; Kas tidak termasuk alpha/terlambat/BPJS perusahaan', () => {
    const p = { ...OCTOBER, netSalary: '930000', items: [
      item('INCOME', 'gaji', 1200000), item('INCOME', 'tunjangan', 200000),
      item('DEDUCTION', 'absen', 400000), item('DEDUCTION', 'bpjs_jht', 60000), item('DEDUCTION', 'kasbon', 10000),
    ] };
    const r = buildJournalLines(p, GL_MAP);
    expect(line(r.lines, '610101', 'CREDIT').amount).toBe(400000);
    expect(line(r.lines, '110101', 'CREDIT').amount).toBe(930000);
    expect(sum(r.lines, 'DEBIT')).toBe(sum(r.lines, 'CREDIT'));
  });

  test('BPJS perusahaan slip proporsional memakai gaji pokok PENUH dari Setting Gaji (sama dengan Laporan BPJS)', () => {
    const p = { ...OCTOBER, netSalary: '1546667', items: [
      item('INCOME', 'gaji', '1666666.67', { quantity: '15' }),
      item('DEDUCTION', 'bpjs_jht', 60000), item('DEDUCTION', 'bpjs_jp', 30000), item('DEDUCTION', 'bpjs_kesehatan', 30000),
    ] };
    const r = buildJournalLines(p, GL_MAP);
    expect(line(r.lines, '60000403', 'DEBIT').amount).toBe(291000);   // bukan 3,7%+2%+4% × 1.666.667
    expect(sum(r.lines, 'DEBIT')).toBe(sum(r.lines, 'CREDIT'));
  });

  test('Bonus Omset, lembur, kerja hari libur, payout cuti → Beban Tunjangan Lainnya (tidak hilang dari jurnal)', () => {
    const p = { ...OCTOBER, netSalary: '1350000', employee: { ...OCTOBER.employee, salarySettings: [] }, items: [
      item('INCOME', 'gaji', 1000000), item('INCOME', 'bonus_omset', 150000), item('INCOME', 'lembur', 100000),
      item('INCOME', 'libur_kerja', 50000), item('INCOME', 'payout_cuti', 50000),
    ] };
    const r = buildJournalLines(p, GL_MAP);
    expect(line(r.lines, '600005', 'DEBIT').amount).toBe(350000);
    expect(line(r.lines, '110101', 'CREDIT').amount).toBe(1350000);
  });

  test('pembulatan per baris tetap seimbang; sisa sen masuk Kas', () => {
    const p = { ...OCTOBER, netSalary: '1101234.67', employee: { ...OCTOBER.employee, salarySettings: [] }, items: [
      item('INCOME', 'gaji', '1000000.40'), item('INCOME', 'makan', '12345.67'), item('INCOME', 'transport', '88888.60'),
    ] };
    const r = buildJournalLines(p, GL_MAP);
    expect(r.error).toBeNull();
    expect(sum(r.lines, 'DEBIT')).toBe(sum(r.lines, 'CREDIT'));
    expect(r.lines.every((l) => Number.isInteger(l.amount))).toBe(true);
    expect(Math.abs(r.kasBank - 1101235)).toBeLessThanOrEqual(1);
  });

  test('kategori item tanpa pasangan akun dilaporkan (sync gagal, tidak dibuang ke Kas)', () => {
    const p = { ...OCTOBER, items: [...OCTOBER.items, item('INCOME', 'kategori_baru', 1000)] };
    expect(buildJournalLines(p, GL_MAP).unknownCategories).toHaveLength(1);
  });

  test('setiap kategori item payroll memetakan ke salah satu dari 8 kategori Akun Gaji', () => {
    for (const cat of [...Object.values(INCOME_ITEM_TO_GL), ...Object.values(DEDUCTION_ITEM_TO_GL)]) {
      expect(DEFAULT_MAPPINGS_FOR_TEST).toContain(cat);
    }
    for (const c of ['gaji', 'makan', 'transport', 'tunjangan', 'komisi', 'lembur', 'libur_kerja', 'bonus_omset', 'payout_cuti']) {
      expect(INCOME_ITEM_TO_GL[c]).toBeDefined();
    }
    for (const c of ['absen', 'terlambat', 'bpjs_jht', 'bpjs_jp', 'bpjs_kesehatan', 'kasbon']) {
      expect(DEDUCTION_ITEM_TO_GL[c]).toBeDefined();
    }
  });

  test('Kas jauh berbeda dari gaji bersih slip → error', () => {
    const r = buildJournalLines({ ...OCTOBER, netSalary: '2000000' }, GL_MAP);
    expect(r.error).toMatch(/tidak sama dengan gaji bersih/);
  });
});

describe('syncPayrollToAccurate', () => {
  beforeEach(() => {
    syncRepo.findPayrollForSync.mockResolvedValue(OCTOBER);
    syncRepo.findGlMappings.mockResolvedValue(MAPPINGS);
  });

  test('POST /journal-voucher/save.do, tanggal dd/MM/yyyy (WIB tanggal bayar), id disimpan sebagai string', async () => {
    accurateRequest.mockResolvedValue({ s: true, r: { id: 79468, number: 'JV.2026.10.00135' } });
    const res = await syncPayrollToAccurate('pr-oct');
    const [ep, opts] = accurateRequest.mock.calls[0];
    expect(ep).toBe('/journal-voucher/save.do');
    expect(opts.method).toBe('POST');
    expect(opts.body).toMatchObject({ branchId: 50, transDate: '04/10/2026', description: 'Penggajian Oktober 2026 — STAFF OP (EMP006)' });
    expect(opts.body.detailJournalVoucher).toHaveLength(9);
    expect(opts.body.detailJournalVoucher[0]).toEqual({ accountNo: '610101', amount: 3000000, amountType: 'DEBIT', memo: 'Beban Gaji Pokok' });
    expect(syncRepo.markPayrollSynced).toHaveBeenCalledWith({ id: 'pr-oct', accurateJournalId: '79468', accurateJournalNumber: 'JV.2026.10.00135' });
    expect(res.accurateJournalNumber).toBe('JV.2026.10.00135');
  });

  test('akun induk ditolak Accurate → pesan Indonesia + petunjuk ganti pemetaan', async () => {
    accurateRequest.mockResolvedValue({ s: false, d: ['Tidak dapat menjurnal akun ""Beban Gaji, Upah & Honorer"". Akun tersebut adalah induk'] });
    await expect(syncPayrollToAccurate('pr-oct')).rejects.toThrow(/Akun Gaji ke akun anak \(bukan akun induk\)/);
    expect(syncRepo.markPayrollSynced).not.toHaveBeenCalled();
  });

  test('pemetaan akun belum lengkap → gagal sebelum memanggil Accurate', async () => {
    syncRepo.findGlMappings.mockResolvedValue(MAPPINGS.filter((m) => m.category !== 'kas_bank'));
    await expect(syncPayrollToAccurate('pr-oct')).rejects.toThrow(/kas_bank/);
    expect(accurateRequest).not.toHaveBeenCalled();
  });

  test('sudah tersinkron → dilewati (idempoten)', async () => {
    syncRepo.findPayrollForSync.mockResolvedValue({ ...OCTOBER, accurateJournalId: '1' });
    await expect(syncPayrollToAccurate('pr-oct')).resolves.toMatchObject({ skipped: true });
    expect(accurateRequest).not.toHaveBeenCalled();
  });
});
