// Regression: G4-22 — retur CANCELLED tidak bisa dihapus; batal dua kali menampilkan pesan "POSTED"
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchaseReturn.repository');
jest.mock('./purchaseReturn.accurate.sync.service', () => ({ pushPurchaseReturnToAccurate: jest.fn() }));
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({
  purchaseReturn: { deleteMany: jest.fn(), updateMany: jest.fn() },
}));

const repo   = require('./purchaseReturn.repository');
const prisma = require('../../config/prisma');
const svc    = require('./purchaseReturn.service');

beforeEach(() => jest.clearAllMocks());

test('hapus retur CANCELLED → berhasil (bersyarat status)', async () => {
  repo.findById.mockResolvedValue({ id: 'pr1', status: 'CANCELLED' });
  prisma.purchaseReturn.deleteMany.mockResolvedValue({ count: 1 });
  await expect(svc.deletePurchaseReturn('pr1')).resolves.toMatchObject({ id: 'pr1' });
  expect(prisma.purchaseReturn.deleteMany).toHaveBeenCalledWith({ where: { id: 'pr1', status: { in: ['DRAFT', 'CANCELLED'] } } });
});

test('hapus retur POSTED tetap ditolak 422', async () => {
  repo.findById.mockResolvedValue({ id: 'pr1', status: 'POSTED' });
  await expect(svc.deletePurchaseReturn('pr1')).rejects.toMatchObject({ statusCode: 422 });
  expect(prisma.purchaseReturn.deleteMany).not.toHaveBeenCalled();
});

test('batalkan retur yang sudah CANCELLED → pesan "sudah dibatalkan"', async () => {
  repo.findById.mockResolvedValue({ id: 'pr1', status: 'CANCELLED' });
  await expect(svc.cancelPurchaseReturn('pr1')).rejects.toMatchObject({ statusCode: 422, message: 'Retur sudah dibatalkan' });
});

test('batal DRAFT bersamaan dengan posting (count 0) → 409', async () => {
  repo.findById.mockResolvedValue({ id: 'pr1', status: 'DRAFT' });
  prisma.purchaseReturn.updateMany.mockResolvedValue({ count: 0 });
  await expect(svc.cancelPurchaseReturn('pr1')).rejects.toMatchObject({ statusCode: 409 });
});
