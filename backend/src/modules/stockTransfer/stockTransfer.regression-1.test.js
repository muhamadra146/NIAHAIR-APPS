// Regression: G4-01 — dua PATCH status IN_TRANSIT paralel sama-sama sukses → stok dipindah dua kali
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./stockTransfer.repository');
const prisma = require('../../config/prisma');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const svc    = require('./stockTransfer.service');

const ITEM = { id: 'ti1', itemId: 'i1', qty: '5', item: { name: 'Shampoo', itemType: 'INVENTORY' } };
const base = (status) => ({
  id: 'tr1', transferNo: 'TRF-1', status,
  sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
  sourceWarehouse: { branchId: 'b1', name: 'A' }, destinationWarehouse: { branchId: 'b2', name: 'B' },
  items: [ITEM],
});

const makeTx = (count) => ({
  stockTransfer:     { updateMany: jest.fn().mockResolvedValue({ count }), deleteMany: jest.fn().mockResolvedValue({ count }) },
  stockTransferItem: { deleteMany: jest.fn() },
  inventory:         { upsert: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '10', qtyReserved: '0' }), update: jest.fn() },
  inventoryMovement: { create: jest.fn() },
  $executeRawUnsafe: jest.fn().mockResolvedValue(count),
  $queryRawUnsafe:   jest.fn().mockResolvedValue([]),
});

beforeEach(() => jest.clearAllMocks());

test('IN_TRANSIT: transisi bersyarat PENDING, count 0 → 409 dan tidak ada movement', async () => {
  repo.findById.mockResolvedValue(base('PENDING'));
  const tx = makeTx(0);
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'SUPER_ADMIN', null))
    .rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Dokumen sudah diproses') });
  expect(tx.stockTransfer.updateMany).toHaveBeenCalledWith({
    where: { id: 'tr1', status: 'PENDING' }, data: { status: 'IN_TRANSIT' },
  });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  expect(createSyncJob).not.toHaveBeenCalled();
});

test('RECEIVED: transisi bersyarat IN_TRANSIT, count 0 → 409', async () => {
  repo.findById.mockResolvedValue(base('IN_TRANSIT'));
  const tx = makeTx(0);
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await expect(svc.updateStatus('tr1', 'RECEIVED', 'SUPER_ADMIN', null)).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.stockTransfer.updateMany).toHaveBeenCalledWith({
    where: { id: 'tr1', status: 'IN_TRANSIT' }, data: { status: 'RECEIVED' },
  });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});

test('hapus IN_TRANSIT (cancel): transisi bersyarat, count 0 → 409', async () => {
  repo.findById.mockResolvedValue(base('IN_TRANSIT'));
  const tx = makeTx(0);
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await expect(svc.deleteTransfer('tr1', 'SUPER_ADMIN', null)).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.stockTransfer.updateMany.mock.calls[0][0].where).toEqual({ id: 'tr1', status: 'IN_TRANSIT' });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});

test('undo receive: UPDATE bersyarat status RECEIVED, 0 baris → 409', async () => {
  repo.findById.mockResolvedValue(base('RECEIVED'));
  jest.doMock('./stockTransfer.sync.repository', () => ({ findReceiveAccurateId: jest.fn().mockResolvedValue(null) }));
  const tx = makeTx(0);
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await expect(svc.undoReceive('tr1', 'SUPER_ADMIN', null)).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.$executeRawUnsafe.mock.calls[0][0]).toMatch(/status = 'RECEIVED'/);
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});
