// Regression: G4-16 — sync transfer ke Accurate gagal validasi → 500 menyembunyikan pesan
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('./stockTransfer.sync.service', () => ({
  syncTransferToAccurate:        jest.fn(),
  syncTransferReceiveToAccurate: jest.fn(),
}));
jest.mock('../../config/prisma', () => ({}));

const repo    = require('./stockTransfer.repository');
const syncSvc = require('./stockTransfer.sync.service');
const svc     = require('./stockTransfer.service');

beforeEach(() => jest.clearAllMocks());

test('transfer tidak ada → 404', async () => {
  repo.findById.mockResolvedValue(null);
  await expect(svc.syncToAccurate('x')).rejects.toMatchObject({ statusCode: 404 });
});

test('transfer PENDING → 422', async () => {
  repo.findById.mockResolvedValue({ id: 'tr1', status: 'PENDING' });
  await expect(svc.syncToAccurate('tr1')).rejects.toMatchObject({ statusCode: 422 });
});

test('error mentah dari sync service → 422 dengan pesan aslinya', async () => {
  repo.findById.mockResolvedValue({ id: 'tr1', status: 'IN_TRANSIT', accurateTransferId: null });
  syncSvc.syncTransferToAccurate.mockRejectedValue(new Error('Source warehouse not mapped to Accurate: A'));
  await expect(svc.syncToAccurate('tr1')).rejects.toMatchObject({
    statusCode: 422,
    message:    expect.stringContaining('Source warehouse not mapped'),
  });
});
