'use strict';

// Regression: G1-29 — komplain RESOLVED dibuka kembali (OPEN) tetap menyimpan resolvedAt,
// sehingga statistik rata-rata waktu penyelesaian ikut menghitungnya.
// Found by /qa on 2026-10-15

jest.mock('./complaint.repository', () => ({ findById: jest.fn(), update: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./complaint.repository');
const svc  = require('./complaint.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue({ id: 'k1', status: 'RESOLVED', resolvedAt: new Date() });
});

test.each(['OPEN', 'IN_PROGRESS'])('RESOLVED → %s mengosongkan resolvedAt', async (status) => {
  await svc.updateComplaint('k1', { status }, 'u1');
  expect(repo.update).toHaveBeenCalledWith('k1', expect.objectContaining({ status, resolvedAt: null }));
});

test('RESOLVED → CLOSED tetap menyimpan resolvedAt', async () => {
  await svc.updateComplaint('k1', { status: 'CLOSED' }, 'u1');
  expect(repo.update.mock.calls[0][1]).not.toHaveProperty('resolvedAt');
});
