// Regression: G4-12 — adjust-batch paralel pada inventory yang sama: lost update (qtyBefore/qtyChange salah)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./inventory.repository');
jest.mock('./inventory.period.service');
jest.mock('./inventory.adjustment.sync.service', () => ({ pushAdjustmentToAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const prisma = require('../../config/prisma');
const svc    = require('./inventory.service');

let tx;
beforeEach(() => {
  jest.clearAllMocks();
  tx = {
    inventory:         {
      findUnique: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '10', qtyReserved: '0', warehouseId: 'wh1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update:     jest.fn(),
    },
    inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv1' }) },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});

test('batch: update bersyarat qtyOnHand yang dibaca; count 0 → 409 tanpa movement', async () => {
  await expect(svc.createBatchStockAdjustment({ reason: 'koreksi', items: [{ inventoryId: 'inv1', qtyActual: 7 }] }))
    .rejects.toMatchObject({ statusCode: 409 });
  expect(tx.inventory.updateMany.mock.calls[0][0].where).toEqual({ id: 'inv1', qtyOnHand: '10' });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});

test('single adjust: guard yang sama', async () => {
  await expect(svc.createStockAdjustment('inv1', { qtyActual: 7, reason: 'koreksi' }))
    .rejects.toMatchObject({ statusCode: 409 });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});

test('batch: count 1 → movement dibuat dengan qtyChange −3', async () => {
  tx.inventory.updateMany.mockResolvedValue({ count: 1 });
  const res = await svc.createBatchStockAdjustment({ reason: 'koreksi', items: [{ inventoryId: 'inv1', qtyActual: 7 }] });
  expect(res.movements[0].qtyChange).toBe('-3.000000');
});
