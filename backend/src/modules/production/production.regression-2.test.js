// Regression: G4-05 — produksi mengabaikan conversionFactor satuan (1 TUBE = 80 GRAM dihitung 1)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./production.repository');
jest.mock('./production.sync.service', () => ({ syncProductionToAccurate: jest.fn().mockResolvedValue(), deleteFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./production.repository');
const prisma = require('../../config/prisma');
const svc    = require('./production.service');

let tx;
beforeEach(() => {
  jest.clearAllMocks();
  tx = {
    productionOrder:    { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    itemUnit:           { findUnique: jest.fn().mockResolvedValue({ conversionFactor: '80' }) },
    inventory:          { upsert: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '1000', qtyReserved: '0' }), update: jest.fn() },
    inventoryMovement:  { create: jest.fn().mockResolvedValue({ id: 'mv1' }) },
    productionMaterial: { update: jest.fn() },
    productionItem:     { update: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});

test('konsumsi material: 2 TUBE → movement −160 (satuan dasar)', async () => {
  repo.findById.mockResolvedValue({
    id: 'po1', productionNo: 'PROD-1', status: 'RELEASED', warehouseId: 'wh1', items: [],
    materials: [{ id: 'm1', itemId: 'i1', unitId: 'TUBE', warehouseId: 'wh1', plannedQuantity: '2', item: { name: 'Cat' } }],
  });

  await svc.updateStatus('po1', 'IN_PROGRESS', 'e1');

  expect(tx.itemUnit.findUnique).toHaveBeenCalledWith(expect.objectContaining({
    where: { itemId_unitId: { itemId: 'i1', unitId: 'TUBE' } },
  }));
  expect(tx.inventoryMovement.create.mock.calls[0][0].data.qtyChange.toString()).toBe('-160');
  expect(tx.inventory.update.mock.calls[0][0].data.qtyOnHand.toString()).toBe('840');
});

test('barang jadi: 1 TUBE → movement +80 (satuan dasar)', async () => {
  repo.findById.mockResolvedValue({
    id: 'po1', productionNo: 'PROD-1', status: 'QC', warehouseId: 'wh1', materials: [],
    qcRecords: [{ status: 'PASS' }],
    items: [{ id: 'p1', itemId: 'i2', unitId: 'TUBE', plannedQuantity: '1', item: { name: 'Produk' } }],
  });

  await svc.updateStatus('po1', 'COMPLETED', 'e1');

  expect(tx.inventoryMovement.create.mock.calls[0][0].data.qtyChange.toString()).toBe('80');
});
