'use strict';

// Keputusan owner 2026-10-23 (CRM-014): diskon manual baris vs diskon membership persen pada
// item yang dapat diskon member → dipakai yang NOMINALNYA lebih besar, tidak ditumpuk.
// Create dan update memakai perhitungan yang sama (computeInvoiceLines).

jest.mock('./invoice.repository', () => ({
  findById:              jest.fn(),
  findCustomerById:      jest.fn(),
  findAppointmentById:   jest.fn(),
  findBranchById:        jest.fn(),
  findItemById:          jest.fn(),
  findItemUnit:          jest.fn(),
  findActivePrice:       jest.fn(),
  findActivePriceGlobal: jest.fn(),
  findMaxInvoiceSeqToday: jest.fn().mockResolvedValue(0),
  createWithTransaction: jest.fn(),
  updateWithTransaction: jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../inventory/inventory.service', () => ({
  generateSaleMovement: jest.fn(), reverseInvoiceSaleMovements: jest.fn(), reverseInvoiceServiceMovements: jest.fn(),
}));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./invoice.workflow', () => ({ handleInvoicePaid: jest.fn() }));
jest.mock('../membership/membership.service', () => ({ getActiveMembership: jest.fn() }));
jest.mock('../membership/membership.repository', () => ({ findById: jest.fn() }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  commission:       { count: jest.fn().mockResolvedValue(0) },
  treatmentSession: { findFirst: jest.fn().mockResolvedValue(null) },
  invoice:          { findUnique: jest.fn().mockResolvedValue(null) },
}));

const repo = require('./invoice.repository');
const { getActiveMembership } = require('../membership/membership.service');
const membershipRepo = require('../membership/membership.repository');
const { createInvoice, updateInvoice } = require('./invoice.service');

const JASA = 'cat-jasa';
const GOLD_PKG = { id: 'gold', name: 'Gold', discountType: 'PERCENTAGE', discountValue: '10', discountCategories: [{ categoryId: JASA }] };
const GOLD = { membership: GOLD_PKG };
const ITEMS = {
  svc:  { id: 'svc',  itemCode: 'SVC',  categoryId: JASA,  excludeMemberDiscount: false, category: { parentId: null } },
  prod: { id: 'prod', itemCode: 'PROD', categoryId: 'sup', excludeMemberDiscount: false, category: { parentId: 'suplemen' } },
};
const svc = (over = {}) => ({ itemId: 'svc', unitId: 'u1', qty: 2, price: 250000, taxable: false, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
  repo.findBranchById.mockResolvedValue({ id: 'b1' });
  repo.findItemById.mockImplementation(async (id) => ITEMS[id]);
  repo.findItemUnit.mockResolvedValue({ id: 'iu1' });
  repo.createWithTransaction.mockImplementation(async ({ invoiceData, itemsData }) => ({ id: 'inv1', ...invoiceData, itemsData }));
  repo.updateWithTransaction.mockImplementation(async ({ invoiceData }) => ({ id: 'inv1', ...invoiceData }));
  getActiveMembership.mockResolvedValue(GOLD);
});

const create = async (items, extra = {}) => {
  await createInvoice({ customerId: 'c1', items, ...extra }, 'u1', 'b1');
  const call = repo.createWithTransaction.mock.calls[0][0];
  return { inv: call.invoiceData, lines: call.itemsData };
};
const n = (v) => Number(v);

describe('diskon manual vs membership persen → yang lebih besar', () => {
  test.each([
    ['manual 20% > member 10%', { discountType: 'PERCENT', discountPercent: 20 }, 100000, 0],
    ['manual 5% < member 10%',  { discountType: 'PERCENT', discountPercent: 5 },  50000,  50000],
    ['manual 10% = member 10% → membership', { discountType: 'PERCENT', discountPercent: 10 }, 50000, 50000],
    ['nominal 30rb < member 50rb', { discountType: 'AMOUNT', discountAmount: 30000 }, 50000, 50000],
    ['nominal 80rb > member 50rb', { discountType: 'AMOUNT', discountAmount: 80000 }, 80000, 0],
    ['tanpa diskon manual', {}, 50000, 50000],
  ])('%s', async (_label, disc, lineDiscount, memberTotal) => {
    // tanpa override (API) dan dengan penanda POS (membershipDiscountTotal > 0) hasilnya sama
    for (const extra of [{}, { membershipDiscountTotal: 1 }]) {
      jest.clearAllMocks();
      repo.createWithTransaction.mockImplementation(async ({ invoiceData }) => ({ id: 'inv1', ...invoiceData }));
      const { inv, lines } = await create([svc(disc)], extra);
      expect(n(lines[0].discount)).toBe(lineDiscount);
      expect(n(inv.totalDiscount)).toBe(lineDiscount);
      expect(n(inv.membershipDiscountTotal)).toBe(memberTotal);
      expect(n(inv.grandTotal)).toBe(500000 - lineDiscount);
      // input manual tersimpan apa adanya (untuk edit)
      expect(lines[0].discountType).toBe(disc.discountType ?? 'AMOUNT');
    }
  });

  test('kasir mematikan diskon membership (membershipDiscountTotal 0) → hanya diskon manual', async () => {
    const { inv, lines } = await create([svc({ discountType: 'PERCENT', discountPercent: 5 })], { membershipDiscountTotal: 0 });
    expect(n(lines[0].discount)).toBe(25000);
    expect(n(inv.membershipDiscountTotal)).toBe(0);
  });

  test('item yang tidak dapat diskon member tetap memakai diskon manual saja', async () => {
    const { inv, lines } = await create([{ itemId: 'prod', unitId: 'u1', qty: 1, price: 137000, discountType: 'AMOUNT', discountAmount: 7000 }]);
    expect(n(lines[0].discount)).toBe(7000);
    expect(n(inv.membershipDiscountTotal)).toBe(0);
  });

  test('update memakai perhitungan yang sama dengan create', async () => {
    const items = [svc({ discountType: 'PERCENT', discountPercent: 5 })];
    const { inv } = await create(items, { membershipDiscountTotal: 50000 });
    repo.findById.mockResolvedValue({ id: 'inv1', invoiceNo: 'INV-1', branchId: 'b1', customerId: 'c1', status: 'UNPAID', totalDeposit: '0', paidAmount: '0', membershipId: 'gold' });
    await updateInvoice('inv1', { items, membershipDiscountTotal: 50000 }, 'u1');
    const upd = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
    expect(n(upd.grandTotal)).toBe(n(inv.grandTotal));
    expect(n(upd.membershipDiscountTotal)).toBe(50000);
  });

  test('edit setelah membership berakhir: paket asal invoice dipakai untuk menghitung ulang', async () => {
    getActiveMembership.mockResolvedValue(null);
    membershipRepo.findById.mockResolvedValue(GOLD_PKG);
    repo.findById.mockResolvedValue({ id: 'inv1', invoiceNo: 'INV-1', branchId: 'b1', customerId: 'c1', status: 'UNPAID', totalDeposit: '0', paidAmount: '0', membershipId: 'gold' });
    await updateInvoice('inv1', { items: [svc()], membershipDiscountTotal: 50000 }, 'u1');
    const upd = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
    expect(membershipRepo.findById).toHaveBeenCalledWith('gold');
    expect(n(upd.grandTotal)).toBe(450000);
    expect(n(upd.membershipDiscountTotal)).toBe(50000);
    expect(upd.membershipId).toBe('gold');
  });
});
