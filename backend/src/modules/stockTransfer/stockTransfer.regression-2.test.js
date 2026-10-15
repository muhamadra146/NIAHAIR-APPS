// Regression: G4-07 — RECEIVED dengan receivedQty > qty dikirim menciptakan stok
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./stockTransfer.repository');
const prisma = require('../../config/prisma');
const svc    = require('./stockTransfer.service');

const TRANSFER = {
  id: 'tr1', transferNo: 'TRF-1', status: 'IN_TRANSIT',
  sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
  sourceWarehouse: { branchId: 'b1', name: 'A' }, destinationWarehouse: { branchId: 'b2', name: 'B' },
  items: [{ id: 'ti1', itemId: 'i1', qty: '5', item: { name: 'Shampoo', itemType: 'INVENTORY' } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(TRANSFER);
});

test('receivedQty melebihi qty dikirim → 422, tidak ada transaksi stok', async () => {
  await expect(svc.updateStatus('tr1', 'RECEIVED', 'SUPER_ADMIN', null, [{ itemId: 'i1', receivedQty: 6 }]))
    .rejects.toMatchObject({ statusCode: 422 });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('item yang tidak ada di transfer → 422', async () => {
  await expect(svc.updateStatus('tr1', 'RECEIVED', 'SUPER_ADMIN', null, [{ itemId: 'lain', receivedQty: 1 }]))
    .rejects.toMatchObject({ statusCode: 422 });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
