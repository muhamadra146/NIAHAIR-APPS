// Regression: G4-13 — IN_PROGRESS mengonsumsi material melebihi stok (stok jadi sangat minus)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./production.repository');
jest.mock('./production.sync.service', () => ({ syncProductionToAccurate: jest.fn(), deleteFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./production.repository');
const prisma = require('../../config/prisma');
const svc    = require('./production.service');

test('stok material kurang → 400, tidak ada movement', async () => {
  const tx = {
    productionOrder:    { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    itemUnit:           { findUnique: jest.fn().mockResolvedValue(null) },
    inventory:          { upsert: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '3', qtyReserved: '0' }), update: jest.fn() },
    inventoryMovement:  { create: jest.fn() },
    productionMaterial: { update: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  repo.findById.mockResolvedValue({
    id: 'po1', productionNo: 'PROD-1', status: 'RELEASED', warehouseId: 'wh1', items: [],
    materials: [{ id: 'm1', itemId: 'i1', unitId: 'u1', warehouseId: 'wh1', plannedQuantity: '5', item: { name: 'Cat' } }],
  });

  await expect(svc.updateStatus('po1', 'IN_PROGRESS', 'e1')).rejects.toMatchObject({
    statusCode: 400, message: expect.stringContaining('tidak mencukupi'),
  });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  expect(tx.inventory.update).not.toHaveBeenCalled();
});
