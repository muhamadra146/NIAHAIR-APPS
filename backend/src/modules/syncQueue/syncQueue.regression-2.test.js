// Regression: G5-03 — job macet di PROCESSING selamanya setelah worker mati (nodemon restart);
// findPending hanya ambil PENDING dan retry menolak PROCESSING
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../../config/prisma', () => ({
  syncQueue: { updateMany: jest.fn(), findUnique: jest.fn() },
}));

const prisma = require('../../config/prisma');
const repo   = require('./syncQueue.repository');
const svc    = require('./syncQueue.service');

const MIN = 60 * 1000;
beforeEach(() => jest.clearAllMocks());

test('reclaimStaleProcessing: PROCESSING yang tidak diperbarui > 10 menit → PENDING', async () => {
  prisma.syncQueue.updateMany.mockResolvedValue({ count: 2 });
  const before = Date.now();
  await expect(repo.reclaimStaleProcessing()).resolves.toBe(2);

  const { where, data } = prisma.syncQueue.updateMany.mock.calls[0][0];
  expect(where.status).toBe('PROCESSING');
  expect(before - where.updatedAt.lt.getTime()).toBeGreaterThanOrEqual(10 * MIN - 50);
  expect(data).toEqual({ status: 'PENDING', startedAt: null });
});

test('retry job PROCESSING yang macet (> 10 menit) diizinkan', async () => {
  prisma.syncQueue.findUnique
    .mockResolvedValueOnce({ id: 'j1', status: 'PROCESSING', updatedAt: new Date(Date.now() - 30 * MIN) })
    .mockResolvedValueOnce({ id: 'j1', status: 'PENDING' });
  prisma.syncQueue.updateMany.mockResolvedValue({ count: 1 });

  await expect(svc.retrySync('j1')).resolves.toMatchObject({ status: 'PENDING' });
  expect(prisma.syncQueue.updateMany.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([
    { status: 'FAILED' },
    expect.objectContaining({ status: 'PROCESSING' }),
  ]));
});

test('retry job PROCESSING yang baru berjalan → 422', async () => {
  prisma.syncQueue.findUnique.mockResolvedValue({ id: 'j1', status: 'PROCESSING', updatedAt: new Date() });
  await expect(svc.retrySync('j1')).rejects.toMatchObject({ statusCode: 422 });
  expect(prisma.syncQueue.updateMany).not.toHaveBeenCalled();
});
