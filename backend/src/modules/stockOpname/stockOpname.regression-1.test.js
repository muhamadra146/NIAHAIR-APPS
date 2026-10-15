// Regression: G4-04 — dua posting stock opname paralel menyesuaikan stok dua kali
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./stockOpname.repository');
jest.mock('./stockOpname.sync.service', () => ({ syncOpnameToAccurate: jest.fn() }));
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn(), stockOpname: { updateMany: jest.fn() } }));

const repo   = require('./stockOpname.repository');
const prisma = require('../../config/prisma');
const svc    = require('./stockOpname.service');

const OPNAME = {
  id: 'op1', opnameNo: 'OPN-1', status: 'IN_PROGRESS', warehouseId: 'wh1',
  items: [{ id: 'oi1', inventoryId: 'inv1', qtySystem: '10', qtyActual: '7', inventory: { item: { name: 'A' } } }],
};

beforeEach(() => jest.clearAllMocks());

test('post: transisi bersyarat ke POSTED; count 0 → 409, tidak ada movement', async () => {
  repo.findById.mockResolvedValue(OPNAME);
  const tx = {
    stockOpname:       { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    inventory:         { findUnique: jest.fn(), update: jest.fn() },
    inventoryMovement: { create: jest.fn() },
    stockOpnameItem:   { update: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await expect(svc.post('op1', 'e1')).rejects.toMatchObject({ statusCode: 409, message: 'Dokumen sudah diproses' });
  expect(tx.stockOpname.updateMany.mock.calls[0][0].where).toEqual({ id: 'op1', status: { in: ['DRAFT', 'IN_PROGRESS'] } });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  expect(tx.inventory.update).not.toHaveBeenCalled();
});

test('cancel bersamaan dengan posting (count 0) → 409', async () => {
  repo.findById.mockResolvedValue(OPNAME);
  prisma.stockOpname.updateMany.mockResolvedValue({ count: 0 });
  await expect(svc.cancel('op1')).rejects.toMatchObject({ statusCode: 409 });
});
