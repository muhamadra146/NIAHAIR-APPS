'use strict';

// G2-09 — Arus Kas Bersih = Kotor − Pembelian − Gaji dibayar (FIN-038, keputusan owner 2026-10-15).
jest.mock('./dashboard.repository');
jest.mock('../setting/setting.repository');

const repo        = require('./dashboard.repository');
const settingRepo = require('../setting/setting.repository');
const svc         = require('./dashboard.service');

beforeEach(() => {
  jest.clearAllMocks();
  settingRepo.findByKey.mockResolvedValue(null);
  repo.findInvoicePayments.mockResolvedValue([{
    paymentNo: 'P1', amount: 1000000, paymentDate: new Date('2026-10-10T03:00:00Z'), invoiceId: 'inv1',
    invoice: { invoiceNo: 'INV-1', customer: { name: 'Ani' } },
  }]);
  repo.findDepositPayments.mockResolvedValue([]);
  repo.findDepositApplications.mockResolvedValue([]);
  repo.findDepositRefunds.mockResolvedValue([]);
  repo.findInvoicesForRevenue.mockResolvedValue([{
    id: 'inv1', grandTotal: 1000000, totalTax: 0, commissions: [],
    items: [{ subtotal: 1000000, isMaterial: false, item: { itemCode: 'COLOR', commissionCategoryId: null } }],
  }]);
  repo.getRevenueSummary.mockResolvedValue({});
  repo.getPurchaseSummary.mockResolvedValue({ total: 200000, count: 1 });
  repo.findBranchWarehouses.mockResolvedValue([]);
  repo.getCommissionSummary.mockResolvedValue({ total: 150000 });
  repo.getPayrollSummary.mockResolvedValue({ total: 300000 });
});

test('komisi tidak dikurangkan dua kali dari arus kas bersih', async () => {
  const res = await svc.getFinanceDashboard({ branchId: 'b1' });
  expect(res.netCashFlow).toBe(1000000 - 200000 - 300000);
  expect(res.commissions).toEqual({ total: 150000 });
});
