// Regression: G4-24 — saldo awal bisa dibuat untuk item yang sudah punya pergerakan stok (menimpa saldo)
// (keputusan owner: tolak 422 jika item sudah punya movement apa pun di gudang tersebut)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./inventory.repository');
jest.mock('./inventory.period.service');
jest.mock('./inventory.adjustment.sync.service', () => ({ pushAdjustmentToAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ warehouse: { findUnique: jest.fn() }, $transaction: jest.fn() }));

const prisma = require('../../config/prisma');
const svc    = require('./inventory.service');

let tx;
beforeEach(() => {
  jest.clearAllMocks();
  prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh1' });
  tx = {
    inventory:         { upsert: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '5', qtyReserved: '0' }), update: jest.fn() },
    inventoryMovement: { count: jest.fn(), create: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});

test('item sudah punya movement (jenis apa pun) → 422, tidak ada perubahan', async () => {
  tx.inventoryMovement.count.mockResolvedValue(1);
  await expect(svc.createOpeningBalance({ warehouseId: 'wh1', items: [{ itemId: 'i1', qty: 10 }] }))
    .rejects.toMatchObject({
      statusCode: 422,
      message: 'Saldo awal hanya untuk item yang belum punya pergerakan stok; gunakan penyesuaian atau stock opname',
    });
  expect(tx.inventoryMovement.count).toHaveBeenCalledWith({ where: { inventoryId: 'inv1' } });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  expect(tx.inventory.update).not.toHaveBeenCalled();
});

test('item tanpa movement → saldo awal dibuat', async () => {
  tx.inventoryMovement.count.mockResolvedValue(0);
  await expect(svc.createOpeningBalance({ warehouseId: 'wh1', items: [{ itemId: 'i1', qty: 10 }] }))
    .resolves.toEqual({ created: 1, skipped: 0 });
  expect(tx.inventoryMovement.create.mock.calls[0][0].data.movementType).toBe('OPENING_BALANCE');
});
