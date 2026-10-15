// Regression: G4-17 — faktur pembelian menerima unitId yang bukan satuan item
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchase.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../../workers/accurateSync.worker', () => ({ processSyncQueue: jest.fn() }));
jest.mock('../inventory/inventory.period.service');
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  item:         { findMany: jest.fn() },
  $transaction: jest.fn(),
}));

const repo   = require('./purchase.repository');
const prisma = require('../../config/prisma');
const svc    = require('./purchase.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findMaxPurchaseSeqToday.mockResolvedValue(0);
  prisma.item.findMany.mockResolvedValue([{ id: 'i1', name: 'Cat', defaultUnitId: 'GRAM', purchaseUnitId: null, itemUnits: [{ unitId: 'TUBE' }] }]);
});

test('create dengan satuan asing → 422, tidak ada transaksi', async () => {
  await expect(svc.createPurchaseInvoice({
    supplierId: 's1', warehouseId: 'wh1', invoiceDate: '2026-10-15',
    items: [{ itemId: 'i1', unitId: 'BOTOL', qty: 1, price: 1 }],
  })).rejects.toMatchObject({ statusCode: 422, message: 'Satuan tidak valid untuk item "Cat"' });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('update dengan satuan asing → 422', async () => {
  repo.findPurchaseInvoiceById.mockResolvedValue({ id: 'pi1', status: 'DRAFT' });
  await expect(svc.updatePurchaseInvoice('pi1', { items: [{ itemId: 'i1', unitId: 'BOTOL', qty: 1, price: 1 }] }))
    .rejects.toMatchObject({ statusCode: 422 });
});
