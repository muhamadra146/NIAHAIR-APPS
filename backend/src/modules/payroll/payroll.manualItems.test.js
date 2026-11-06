'use strict';

// Item gaji manual (PAY-038): THR, bonus/insentif, rapel, koreksi kelebihan bayar, potongan lainnya
jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../notification/notification.service', () => ({ payrollPending: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const { safeParse } = require('valibot');
const fs     = require('fs');
const path   = require('path');
const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');
const tax    = require('./payroll.tax');
const { createManualItemSchema } = require('./payroll.validation');
const { buildJournalLines } = require('./payroll.sync.service');

const seedSql = fs.readFileSync(path.join(__dirname, '../../../prisma/migrations/20261106_pph21_setup/migration.sql'), 'utf8');
const [pasal17Brackets, terA, terB, terC] = [...seedSql.matchAll(/'(\[\{"upTo".*?\])'/g)].map((m) => JSON.parse(m[1]));
const TAX_SETTING = {
  year: 2024, ptkpSelf: '54000000', ptkpMarried: '4500000', ptkpDependent: '4500000', maxDependents: 3,
  positionCostPercent: '5', positionCostMonthlyMax: '500000', pasal17Brackets, terA, terB, terC,
};

const SALARY = {
  baseSalary: '6000000', mealAllowancePerDay: 0, tunjangan: 0, transportAllowance: 0, overtimeRatePerHour: 0,
  holidayRatePerDay: 0, absentDeductionPerDay: 0, bpjsJhtPercent: '0', bpjsJpPercent: '0', bpjsKesehatanEmployeePercent: '0',
  bpjsJhtEmployerPercent: '0', bpjsJpEmployerPercent: '0', bpjsKesehatanEmployerPercent: '0', bpjsJkkEmployerPercent: '0', bpjsJkmEmployerPercent: '0',
};

// Gaji Desember 2026 (dibayar 1 Jan 2027 → masa Januari 2027)
const DRAFT = {
  id: 'pr1', status: 'DRAFT', employeeId: 'e1', branchId: 'b1',
  periodStart: new Date('2026-12-01'), periodEnd: new Date('2026-12-31'),
  items: [{ id: 'auto1', type: 'INCOME', category: 'gaji', amount: '6000000', isAuto: true }],
};
const manual = (id, category, type, amount) => ({ id, type, category, label: category, amount: String(amount), isAuto: false, notes: 'uji', createdBy: 'u1' });

let saved;
beforeEach(() => {
  jest.clearAllMocks();
  saved = null;
  repo.getGenerationData.mockResolvedValue({
    salarySetting: SALARY, schedules: [], attendances: [], commissions: [], activeLoans: [],
    unusedLeavePayouts: [], approvedLatePermissions: [], holidays: [], omsetBonusTiers: [], branchOmset: 0,
    employment: { hireDate: null, resignDate: null, ptkpStatus: 'TK0', taxEmploymentType: 'PERMANENT' },
  });
  repo.findTaxSetting.mockResolvedValue(TAX_SETTING);
  repo.findTaxYearPayrolls.mockResolvedValue([]);
  repo.createItem.mockImplementation((d) => ({ id: 'new1', ...d }));
  prisma.$transaction.mockImplementation((fn) => fn({ commission: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } }));
  repo.update.mockImplementation((id, data) => { saved = data; return { id, ...data }; });
});

describe('validasi', () => {
  test.each([
    [{ category: 'thr', amount: 6000000, notes: 'THR Idul Fitri 2027' }, true],
    [{ category: 'thr', amount: 6000000 }, false],                       // keterangan wajib
    [{ category: 'thr', amount: 6000000, notes: '  ' }, false],          // keterangan kosong
    [{ category: 'thr', amount: 0, notes: 'THR' }, false],               // nominal > 0
    [{ category: 'reimburse', amount: 1000, notes: 'bensin' }, false],   // jenis tidak dikenal
  ])('%p → valid=%p', (body, ok) => {
    expect(safeParse(createManualItemSchema, body).success).toBe(ok);
  });
});

describe('tambah item', () => {
  test('THR tersimpan sebagai item manual dengan penambah, lalu ikut total & PPh 21', async () => {
    repo.findById
      .mockResolvedValueOnce(DRAFT)                                                         // cek Draft
      .mockResolvedValueOnce({ ...DRAFT, items: [...DRAFT.items, manual('m1', 'thr', 'INCOME', 6000000)] }); // saat hitung ulang

    await svc.addManualItem('pr1', { category: 'thr', amount: 6000000, notes: 'THR Idul Fitri 2027' }, 'u1');

    expect(repo.createItem).toHaveBeenCalledWith(expect.objectContaining({
      payrollId: 'pr1', type: 'INCOME', category: 'thr', label: 'THR', isAuto: false, notes: 'THR Idul Fitri 2027', createdBy: 'u1',
    }));
    // item manual tidak ikut dihapus/disimpan ulang sebagai item otomatis
    const autoSaved = repo.replaceAutoItems.mock.calls[0][1];
    expect(autoSaved.some((i) => i.category === 'thr')).toBe(false);
    // bruto 6 jt + THR 6 jt = 12 jt → TER A 4% = 480.000
    expect(Number(saved.taxGross)).toBe(12000000);
    expect(Number(saved.pph21)).toBe(480000);
    expect(Number(saved.grossIncome)).toBe(12000000);
    expect(Number(saved.netSalary)).toBe(12000000 - 480000);
  });

  test('payroll bukan Draft → 422, tidak ada item dibuat', async () => {
    repo.findById.mockResolvedValue({ ...DRAFT, status: 'PENDING_APPROVAL' });
    await expect(svc.addManualItem('pr1', { category: 'thr', amount: 1000, notes: 'THR' }, 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.createItem).not.toHaveBeenCalled();
  });

  test('hitung ulang gagal → item yang baru dibuat dihapus lagi', async () => {
    repo.findById.mockResolvedValueOnce(DRAFT).mockResolvedValueOnce(DRAFT);
    repo.findTaxSetting.mockResolvedValue(null);  // tarif belum ada → hitung ulang gagal
    await expect(svc.addManualItem('pr1', { category: 'bonus_insentif', amount: 500000, notes: 'Bonus target' }, 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.deleteItem).toHaveBeenCalledWith('new1');
  });
});

describe('ubah & hapus', () => {
  const withManual = { ...DRAFT, items: [...DRAFT.items, manual('m1', 'rapel', 'INCOME', 300000)] };

  test('ubah nominal & keterangan item manual', async () => {
    repo.findById.mockResolvedValue(withManual);
    await svc.updateManualItem('pr1', 'm1', { amount: 450000, notes: 'Rapel tunjangan Maret' }, 'u1');
    expect(repo.updateItem).toHaveBeenCalledWith('m1', expect.objectContaining({ notes: 'Rapel tunjangan Maret' }));
    expect(Number(repo.updateItem.mock.calls[0][1].amount)).toBe(450000);
  });

  test('item otomatis tidak bisa diubah/dihapus manual', async () => {
    repo.findById.mockResolvedValue(withManual);
    await expect(svc.updateManualItem('pr1', 'auto1', { amount: 1, notes: 'x' }, 'u1')).rejects.toMatchObject({ statusCode: 422 });
    await expect(svc.deleteManualItem('pr1', 'auto1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.deleteItem).not.toHaveBeenCalled();
  });

  test('hapus item manual', async () => {
    repo.findById.mockResolvedValue(withManual);
    await svc.deleteManualItem('pr1', 'm1', 'u1');
    expect(repo.deleteItem).toHaveBeenCalledWith('m1');
  });
});

describe('pengaruh ke bruto pajak', () => {
  test('koreksi kelebihan bayar mengurangi bruto; potongan lainnya tidak', () => {
    const items = [
      { type: 'INCOME', category: 'gaji', amount: '6000000' },
      { type: 'INCOME', category: 'rapel', amount: '500000' },
      { type: 'DEDUCTION', category: 'koreksi_lebih_bayar', amount: '200000' },
      { type: 'DEDUCTION', category: 'potongan_lain', amount: '100000' },
    ];
    expect(tax.computeTaxGross({ items, employer: {} })).toBe(6300000);
  });
});

describe('jurnal Accurate', () => {
  test('tiap jenis item manual ke akunnya sendiri; seimbang', () => {
    const GL = Object.fromEntries(
      ['gaji', 'tunjangan_makan', 'tunjangan_transport', 'tunjangan_lain', 'beban_thr', 'beban_bonus', 'beban_rapel', 'bpjs_perusahaan',
        'hutang_bpjs', 'hutang_pph21', 'kasbon', 'koreksi_gaji', 'potongan_lain', 'kas_bank']
        .map((c, i) => [c, { category: c, glAccount: { number: `A${i}` } }]),
    );
    const it = (type, category, amount) => ({ type, category, label: category, amount: String(amount), quantity: null });
    const r = buildJournalLines({
      netSalary: '12100000', employee: { salarySettings: [SALARY] },
      items: [
        it('INCOME', 'gaji', 6000000), it('INCOME', 'thr', 6000000), it('INCOME', 'bonus_insentif', 500000), it('INCOME', 'rapel', 300000),
        it('DEDUCTION', 'koreksi_lebih_bayar', 200000), it('DEDUCTION', 'potongan_lain', 100000), it('DEDUCTION', 'pph21', 400000),
      ],
    }, GL);
    expect(r.error).toBeNull();
    expect(r.unknownCategories).toEqual([]);
    const line = (cat) => r.lines.find((l) => l.accountNo === GL[cat].glAccount.number);
    expect(line('beban_thr')).toMatchObject({ amount: 6000000, amountType: 'DEBIT' });
    expect(line('beban_bonus')).toMatchObject({ amount: 500000, amountType: 'DEBIT' });
    expect(line('beban_rapel')).toMatchObject({ amount: 300000, amountType: 'DEBIT' });
    expect(line('koreksi_gaji')).toMatchObject({ amount: 200000, amountType: 'CREDIT' });
    expect(line('potongan_lain')).toMatchObject({ amount: 100000, amountType: 'CREDIT' });
    expect(r.totalDebit).toBe(r.totalCredit);
  });
});
