// Regression: G4-21 — cek cabang dilewati jika gudang tidak punya cabang (siapa pun bisa memproses)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./stockTransfer.repository');
const prisma = require('../../config/prisma');
const svc    = require('./stockTransfer.service');

const NO_BRANCH = {
  id: 'tr1', transferNo: 'TRF-1', status: 'PENDING',
  sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
  sourceWarehouse: { branchId: null, name: 'A' }, destinationWarehouse: { branchId: null, name: 'B' },
  items: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(NO_BRANCH);
  prisma.$transaction.mockImplementation((fn) => fn({
    stockTransfer: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  }));
});

test('MANAGER tidak boleh memproses transfer gudang tanpa cabang → 403', async () => {
  await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'MANAGER', 'b1')).rejects.toMatchObject({ statusCode: 403 });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('MANAGER tidak boleh menghapus transfer gudang tanpa cabang → 403', async () => {
  await expect(svc.deleteTransfer('tr1', 'MANAGER', 'b1')).rejects.toMatchObject({ statusCode: 403 });
});

test('INVENTORY boleh memproses transfer gudang tanpa cabang', async () => {
  await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'INVENTORY', 'b1')).resolves.toBeDefined();
});

test('gudang bercabang tetap dicek per cabang (cabang lain → 403)', async () => {
  repo.findById.mockResolvedValue({ ...NO_BRANCH, sourceWarehouse: { branchId: 'b1', name: 'A' } });
  await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'INVENTORY', 'b2')).rejects.toMatchObject({ statusCode: 403 });
});
