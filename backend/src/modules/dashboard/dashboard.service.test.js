'use strict';

jest.mock('./dashboard.repository');
jest.mock('../setting/setting.repository');

const repo        = require('./dashboard.repository');
const settingRepo = require('../setting/setting.repository');
const svc         = require('./dashboard.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findInvoicePayments.mockResolvedValue([{
    paymentNo: 'P1', amount: 300000, paymentDate: new Date('2026-10-10T03:00:00Z'), invoiceId: 'inv1',
    invoice: { invoiceNo: 'INV-1', customer: { name: 'Ani' } },
  }]);
  repo.findDepositPayments.mockResolvedValue([]);
  repo.findDepositApplications.mockResolvedValue([]);
  repo.findDepositRefunds.mockResolvedValue([]);
  repo.findInvoicesForRevenue.mockResolvedValue([{
    id: 'inv1', grandTotal: 300000, totalTax: 0, commissions: [],
    items: [{ subtotal: 200000, isMaterial: false, item: { itemCode: 'COLOR', commissionCategoryId: null } },
            { subtotal: 100000, isMaterial: false, item: { itemCode: '101313', commissionCategoryId: null } }],
  }]);
});

test('kode item dibaca dari pengaturan (Ongkos PP dikeluarkan dari bersih)', async () => {
  settingRepo.findByKey.mockImplementation(async (key) =>
    key === 'finance_ongkos_pp_item_codes' ? { value: '["101313"]' } : null);
  const { summary } = await svc.getFinanceDetails({ type: 'revenue', branchId: 'b1' });
  expect(summary).toMatchObject({ gross: 300000, netBefore: 200000 });
  expect(repo.findInvoicePayments).toHaveBeenCalledWith(expect.objectContaining({ branchId: 'b1' }));
});

test('pengaturan rusak tidak menggagalkan dashboard (tidak ada potongan item)', async () => {
  settingRepo.findByKey.mockResolvedValue({ value: 'bukan json' });
  const { summary } = await svc.getFinanceDetails({ type: 'revenue' });
  expect(summary).toMatchObject({ gross: 300000, netBefore: 300000 });
});

test('jenis rincian tidak dikenal → 400', async () => {
  await expect(svc.getFinanceDetails({ type: 'gaji' })).rejects.toMatchObject({ statusCode: 400 });
});
