// Regression: G4-05 — faktur pembelian mengabaikan conversionFactor: beli 1 TUBE (=80 GRAM) menambah 1
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchase.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn().mockResolvedValue({}) }));
jest.mock('../../workers/accurateSync.worker', () => ({ processSyncQueue: jest.fn().mockResolvedValue({}) }));
jest.mock('../inventory/inventory.period.service');
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  item:           { findMany: jest.fn() },
  purchaseReturn: { count: jest.fn().mockResolvedValue(0) },
  $transaction:   jest.fn(),
}));

const repo   = require('./purchase.repository');
const prisma = require('../../config/prisma');
const svc    = require('./purchase.service');

beforeEach(() => jest.clearAllMocks());

test('create: 1 TUBE → movement PURCHASE +80 (satuan dasar)', async () => {
  repo.findMaxPurchaseSeqToday.mockResolvedValue(0);
  prisma.item.findMany.mockResolvedValue([{ id: 'i1', name: 'Cat', defaultUnitId: 'GRAM', purchaseUnitId: null, itemUnits: [{ unitId: 'TUBE' }] }]);
  const tx = {
    purchaseInvoice:   { create: jest.fn().mockResolvedValue({
      id: 'pi1', invoiceNo: 'PI-1', notes: null,
      items: [{ id: 'pii1', itemId: 'i1', unitId: 'TUBE', qty: '1', price: '100', item: { itemType: 'INVENTORY' } }],
    }) },
    itemUnit:          { findUnique: jest.fn().mockResolvedValue({ conversionFactor: '80' }) },
    inventory:         { findUnique: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '0', qtyReserved: '0' }), update: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await svc.createPurchaseInvoice({
    supplierId: 's1', warehouseId: 'wh1', invoiceDate: '2026-10-15',
    items: [{ itemId: 'i1', unitId: 'TUBE', qty: 1, price: 100 }],
  });

  expect(tx.inventoryMovement.create.mock.calls[0][0].data.qtyChange.toString()).toBe('80');
  expect(tx.inventory.update.mock.calls[0][0].data.qtyOnHand.toString()).toBe('80');
});

test('cancel: pembalikan memakai qty movement PURCHASE asli (−80), bukan qty dokumen (−1)', async () => {
  repo.findPurchaseInvoiceById.mockResolvedValue({
    id: 'pi1', invoiceNo: 'PI-1', status: 'POSTED', warehouseId: 'wh1', invoiceDate: '2026-10-15',
    items: [{ id: 'pii1', itemId: 'i1', unitId: 'TUBE', qty: '1', price: '100', item: { itemType: 'INVENTORY' } }],
  });
  const tx = {
    purchaseInvoice:   { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    purchaseReturn:    { count: jest.fn().mockResolvedValue(0) },
    inventory:         { findUnique: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '100', qtyReserved: '0' }), update: jest.fn() },
    inventoryMovement: { aggregate: jest.fn().mockResolvedValue({ _sum: { qtyChange: '80' } }), create: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await svc.cancelPurchaseInvoice('pi1');

  expect(tx.inventoryMovement.aggregate.mock.calls[0][0].where).toEqual({ purchaseInvoiceItemId: 'pii1', movementType: 'PURCHASE' });
  expect(tx.inventoryMovement.create.mock.calls[0][0].data.qtyChange.toString()).toBe('-80');
});
