// Regression: G4-19 — job sync yang sama bisa diproses dua kali bersamaan (inline + interval worker)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../../config/prisma', () => ({
  syncQueue: { updateMany: jest.fn(), update: jest.fn() },
  customer:  { findUnique: jest.fn() },
}));

const prisma = require('../../config/prisma');
const repo   = require('./syncQueue.repository');

beforeEach(() => jest.clearAllMocks());

test('claimPending: update bersyarat PENDING → PROCESSING; count 0 → false', async () => {
  prisma.syncQueue.updateMany.mockResolvedValue({ count: 0 });
  await expect(repo.claimPending('j1')).resolves.toBe(false);
  expect(prisma.syncQueue.updateMany).toHaveBeenCalledWith({
    where: { id: 'j1', status: 'PENDING' },
    data:  { status: 'PROCESSING', startedAt: expect.any(Date) },
  });
});

test('claimPending: count 1 → true', async () => {
  prisma.syncQueue.updateMany.mockResolvedValue({ count: 1 });
  await expect(repo.claimPending('j1')).resolves.toBe(true);
});

test('entityExists (G1-30): data terhapus → false; entityType tak dikenal → null', async () => {
  prisma.customer.findUnique.mockResolvedValue(null);
  await expect(repo.entityExists('CUSTOMER', 'c1')).resolves.toBe(false);
  await expect(repo.entityExists('BRANCH', 'b1')).resolves.toBeNull();
});
