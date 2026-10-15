// Regression: G5-04 — retry job SUCCESS me-reset ke PENDING (push ulang invoice/payment ke Accurate → duplikat)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../../config/prisma', () => ({
  syncQueue: { updateMany: jest.fn(), findUnique: jest.fn() },
}));

const prisma = require('../../config/prisma');
const svc    = require('./syncQueue.service');

beforeEach(() => jest.clearAllMocks());

test.each(['SUCCESS', 'PENDING'])('retry job %s → 422, tidak di-reset', async (status) => {
  prisma.syncQueue.findUnique.mockResolvedValue({ id: 'j1', status, updatedAt: new Date(0) });
  await expect(svc.retrySync('j1')).rejects.toMatchObject({ statusCode: 422 });
  expect(prisma.syncQueue.updateMany).not.toHaveBeenCalled();
});

test('retry job FAILED → di-reset ke PENDING (bersyarat status)', async () => {
  prisma.syncQueue.findUnique
    .mockResolvedValueOnce({ id: 'j1', status: 'FAILED', updatedAt: new Date() })
    .mockResolvedValueOnce({ id: 'j1', status: 'PENDING' });
  prisma.syncQueue.updateMany.mockResolvedValue({ count: 1 });
  await expect(svc.retrySync('j1')).resolves.toMatchObject({ status: 'PENDING' });
  expect(prisma.syncQueue.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'PENDING', attempt: 0 });
});

test('status berubah di antara cek dan reset (count 0) → 409', async () => {
  prisma.syncQueue.findUnique.mockResolvedValue({ id: 'j1', status: 'FAILED', updatedAt: new Date() });
  prisma.syncQueue.updateMany.mockResolvedValue({ count: 0 });
  await expect(svc.retrySync('j1')).rejects.toMatchObject({ statusCode: 409 });
});
