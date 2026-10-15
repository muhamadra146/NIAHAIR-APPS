// Regression: G4-10 — DELETE production order mengubah stok tanpa baris inventory movement
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./production.repository');
jest.mock('./production.sync.service', () => ({ syncProductionToAccurate: jest.fn(), deleteFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn(), $queryRawUnsafe: jest.fn() }));

const repo   = require('./production.repository');
const prisma = require('../../config/prisma');
const svc    = require('./production.service');

test('hapus order: tiap pembalikan stok punya movement pembalik', async () => {
  const movements = {
    mvMat: { inventoryId: 'invA', qtyChange: '-160', warehouseId: 'wh1', referenceId: 'm1' },
    mvFg:  { inventoryId: 'invB', qtyChange: '80',   warehouseId: 'wh1', referenceId: 'p1' },
  };
  const tx = {
    productionOrder:   { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    inventoryMovement: {
      findUnique: jest.fn(({ where }) => Promise.resolve(movements[where.id])),
      create:     jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(({ where }) => Promise.resolve({ id: where.id, qtyOnHand: '100', qtyReserved: '0' })),
      update:     jest.fn(),
    },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  prisma.$queryRawUnsafe.mockResolvedValue([{}]);
  repo.findById.mockResolvedValue({
    id: 'po1', productionNo: 'PROD-1', status: 'COMPLETED',
    materials: [{ id: 'm1', itemId: 'i1', inventoryMovementId: 'mvMat', item: { name: 'Cat' } }],
    items:     [{ id: 'p1', itemId: 'i2', inventoryMovementId: 'mvFg',  item: { name: 'Produk' } }],
  });

  await svc.remove('po1');

  const created = tx.inventoryMovement.create.mock.calls.map((c) => c[0].data);
  expect(created).toHaveLength(2);
  expect(created[0]).toMatchObject({ inventoryId: 'invA', referenceNo: 'PROD-1', referenceType: 'PRODUCTION' });
  expect(created[0].qtyChange.toString()).toBe('160');
  expect(created[0].qtyAfter.toString()).toBe('260');
  expect(created[1].qtyChange.toString()).toBe('-80');
  expect(tx.inventory.update).toHaveBeenCalledTimes(2);
  expect(repo.remove).toHaveBeenCalledWith('po1', tx);
});
