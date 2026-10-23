'use strict';

// Regression (QA membership 2026-10-23):
//   Edit invoice member setelah membership pelanggan dibatalkan/berakhir → membershipId
//   ikut terhapus padahal diskon membership tetap tersimpan → Detail Invoice menampilkan
//   diskon dua kali ("Diskon Item Rp 50.000 · Diskon Membership Rp 50.000" = Rp 100.000).
// Found by /qa on 2026-10-23

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
jest.mock('../membership/membership.repository', () => ({ findById: jest.fn().mockResolvedValue(null) }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  commission:       { count: jest.fn().mockResolvedValue(0) },
  treatmentSession: { findFirst: jest.fn().mockResolvedValue(null) },
  invoice:          { findUnique: jest.fn().mockResolvedValue(null) },
}));

const repo = require('./invoice.repository');
const { getActiveMembership } = require('../membership/membership.service');
const { updateInvoice } = require('./invoice.service');

const JASA = 'cat-jasa';
const posLine = { itemId: 'i1', unitId: 'u1', qty: 1, price: 500000, taxable: false, discountType: 'PERCENT', discountPercent: 10 };
const existing = {
  id: 'inv1', invoiceNo: 'INV-1', branchId: 'b1', customerId: 'c1', status: 'UNPAID',
  membershipId: 'gold', membershipDiscountTotal: '50000', grandTotal: '450000',
  totalDeposit: '0', paidAmount: '0',
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findItemById.mockResolvedValue({ id: 'i1', itemCode: 'SVC', categoryId: JASA, excludeMemberDiscount: false, category: { parentId: null } });
  repo.findItemUnit.mockResolvedValue({ id: 'iu1' });
  repo.updateWithTransaction.mockImplementation(async ({ invoiceData }) => ({ id: 'inv1', ...invoiceData }));
  repo.findById.mockResolvedValue(existing);
});

test('membership sudah dibatalkan, diskon tersimpan dipertahankan → membershipId tetap paket asal', async () => {
  getActiveMembership.mockResolvedValue(null);
  await updateInvoice('inv1', { items: [posLine], membershipDiscountTotal: 50000 }, 'u1');
  const data = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
  expect(String(data.grandTotal)).toBe('450000');
  expect(String(data.membershipDiscountTotal)).toBe('50000');
  expect(data.membershipId).toBe('gold');
});

test('diskon membership dihapus saat edit (override 0) → membershipId dilepas', async () => {
  getActiveMembership.mockResolvedValue(null);
  await updateInvoice('inv1', { items: [{ ...posLine, discountType: 'AMOUNT', discountPercent: undefined }], membershipDiscountTotal: 0 }, 'u1');
  const data = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
  expect(String(data.membershipDiscountTotal)).toBe('0');
  expect(data.membershipId).toBeNull();
});
