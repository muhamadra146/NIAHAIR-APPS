// Regression: G4-05 — retur pembelian mengabaikan conversionFactor (retur 1 TUBE = 80 GRAM hanya mengurangi 1)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchaseReturn.repository');
jest.mock('./purchaseReturn.accurate.sync.service', () => ({ pushPurchaseReturnToAccurate: jest.fn() }));
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./purchaseReturn.repository');
const prisma = require('../../config/prisma');
const svc    = require('./purchaseReturn.service');

test('post retur 1 TUBE → movement −80 dalam satuan dasar', async () => {
  repo.findById.mockResolvedValue({
    id: 'pr1', status: 'DRAFT', purchaseInvoiceId: 'pi1', returnNo: 'PR-1', returnDate: '2026-10-15',
    items: [{ id: 'ri1', itemId: 'i1', unitId: 'TUBE', qty: '1', price: '10', item: { name: 'Cat', itemType: 'INVENTORY' } }],
  });
  const tx = {
    purchaseReturn:      { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    $queryRawUnsafe:     jest.fn().mockResolvedValue([{ warehouseId: 'wh1', status: 'POSTED' }]),
    purchaseInvoiceItem: { findMany: jest.fn().mockResolvedValue([{ itemId: 'i1', unitId: 'TUBE', qty: '2' }]) },
    purchaseReturnItem:  { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    itemUnit:            { findUnique: jest.fn().mockResolvedValue({ conversionFactor: '80' }) },
    inventory:           { findUnique: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '200', qtyReserved: '0' }), update: jest.fn() },
    inventoryMovement:   { create: jest.fn().mockResolvedValue({ id: 'mv1' }) },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await svc.postPurchaseReturn('pr1', 'e1');

  expect(tx.inventoryMovement.create.mock.calls[0][0].data.qtyChange.toString()).toBe('-80');
  expect(tx.inventory.update.mock.calls[0][0].data.qtyOnHand.toString()).toBe('120');
});
