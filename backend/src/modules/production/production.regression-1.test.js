// Regression: G4-02 — dua request IN_PROGRESS paralel mengonsumsi material dua kali
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./production.repository');
jest.mock('./production.sync.service', () => ({ syncProductionToAccurate: jest.fn(), deleteFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn(), $queryRawUnsafe: jest.fn() }));

const repo   = require('./production.repository');
const prisma = require('../../config/prisma');
const svc    = require('./production.service');

const ORDER = {
  id: 'po1', productionNo: 'PROD-1', status: 'RELEASED', warehouseId: 'wh1',
  materials: [{ id: 'm1', itemId: 'i1', unitId: 'u1', warehouseId: 'wh1', plannedQuantity: '2', item: { name: 'Cat' } }],
  items: [],
};

let tx;
beforeEach(() => {
  jest.clearAllMocks();
  tx = {
    productionOrder:    { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    itemUnit:           { findUnique: jest.fn() },
    inventory:          { upsert: jest.fn(), update: jest.fn() },
    inventoryMovement:  { create: jest.fn() },
    productionMaterial: { update: jest.fn() },
    productionQC:       { create: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});

test('IN_PROGRESS: transisi bersyarat dari status awal, count 0 → 409, material tidak dikonsumsi', async () => {
  repo.findById.mockResolvedValue(ORDER);
  await expect(svc.updateStatus('po1', 'IN_PROGRESS', 'e1')).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.productionOrder.updateMany).toHaveBeenCalledWith({
    where: { id: 'po1', status: 'RELEASED' }, data: { status: 'IN_PROGRESS' },
  });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});

test('submitQC paralel: transisi bersyarat dari QC, count 0 → 409', async () => {
  repo.findById.mockResolvedValue({ ...ORDER, status: 'QC' });
  await expect(svc.submitQC('po1', { status: 'PASS' }, 'e1')).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.productionOrder.updateMany.mock.calls[0][0].where).toEqual({ id: 'po1', status: 'QC' });
  expect(tx.productionQC.create).not.toHaveBeenCalled();
});

test('hapus paralel: order sudah tidak ada/berubah → 409, stok tidak dibalik', async () => {
  repo.findById.mockResolvedValue({ ...ORDER, materials: [{ ...ORDER.materials[0], inventoryMovementId: 'mv1' }] });
  prisma.$queryRawUnsafe.mockResolvedValue([{}]);
  await expect(svc.remove('po1')).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});
