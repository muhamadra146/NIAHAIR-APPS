'use strict';

// Regression: G1-01 — POST/PATCH /invoices menerima harga negatif, diskon > total baris, diskon % > 100
// sehingga grandTotal negatif, invoice tercatat PAID dan dikirim ke Accurate.
// Found by /qa on 2026-10-15

jest.mock('./invoice.repository', () => ({
  findById:                   jest.fn(),
  findCustomerById:           jest.fn(),
  findAppointmentById:        jest.fn(),
  findBranchById:             jest.fn(),
  findItemById:               jest.fn(),
  findItemUnit:               jest.fn(),
  findActivePrice:            jest.fn(),
  findActivePriceGlobal:      jest.fn(),
  findMaxInvoiceSeqToday:     jest.fn().mockResolvedValue(0),
  createWithTransaction:      jest.fn(),
  updateWithTransaction:      jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../inventory/inventory.service', () => ({
  generateSaleMovement: jest.fn(), reverseInvoiceSaleMovements: jest.fn(), reverseInvoiceServiceMovements: jest.fn(),
}));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./invoice.workflow', () => ({ handleInvoicePaid: jest.fn() }));
jest.mock('../membership/membership.service', () => ({ getActiveMembership: jest.fn().mockResolvedValue(null) }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({ commission: { count: jest.fn().mockResolvedValue(0) } }));

const v       = require('valibot');
const repo    = require('./invoice.repository');
const { createInvoice, updateInvoice } = require('./invoice.service');
const { createInvoiceSchema } = require('./invoice.validation');

const line = (extra) => ({ itemId: 'item1', unitId: 'unit1', qty: 1, price: 100000, ...extra });

beforeEach(() => {
  jest.clearAllMocks();
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
  repo.findBranchById.mockResolvedValue({ id: 'b1' });
  repo.findItemById.mockResolvedValue({ id: 'item1', itemCode: 'X' });
  repo.findItemUnit.mockResolvedValue({ id: 'iu1' });
  repo.findById.mockResolvedValue({ id: 'inv1', status: 'UNPAID', customerId: 'c1', branchId: 'b1', totalDeposit: '0', paidAmount: '0' });
});

describe('validasi skema item', () => {
  const parse = (item) => v.safeParse(createInvoiceSchema, { customerId: 'c1', items: [item] });

  test('harga negatif ditolak', () => expect(parse(line({ price: -1 })).success).toBe(false));
  test('diskon persen > 100 ditolak', () => expect(parse(line({ discountType: 'PERCENT', discountPercent: 150 })).success).toBe(false));
  test('diskon persen 100 diterima', () => expect(parse(line({ discountType: 'PERCENT', discountPercent: 100 })).success).toBe(true));
});

describe('createInvoice', () => {
  test('diskon nominal melebihi harga × qty → 422, invoice tidak dibuat', async () => {
    await expect(createInvoice({ customerId: 'c1', items: [line({ discountAmount: 150000 })] }, 'u1', 'b1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Diskon tidak boleh melebihi harga' });
    expect(repo.createWithTransaction).not.toHaveBeenCalled();
  });

  test('harga negatif lolos skema (pemanggil lain) tetap ditolak service', async () => {
    await expect(createInvoice({ customerId: 'c1', items: [line({ price: -50000 })] }, 'u1', 'b1'))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(repo.createWithTransaction).not.toHaveBeenCalled();
  });

  test('diskon persen 150 di service → 422', async () => {
    await expect(createInvoice({ customerId: 'c1', items: [line({ discountType: 'PERCENT', discountPercent: 150 })] }, 'u1', 'b1'))
      .rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('updateInvoice', () => {
  test('diskon nominal melebihi harga × qty → 422, item tidak diganti', async () => {
    await expect(updateInvoice('inv1', { items: [line({ qty: 2, discountAmount: 200001 })] }, 'u1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Diskon tidak boleh melebihi harga' });
    expect(repo.updateWithTransaction).not.toHaveBeenCalled();
  });
});
