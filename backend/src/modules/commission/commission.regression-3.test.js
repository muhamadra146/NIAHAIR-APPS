'use strict';

// Regression — UI QA 2026-10-18: "Cannot approve: status is APPROVED, expected PENDING" (bahasa Inggris)
jest.mock('./commission.repository');

const repo = require('./commission.repository');
const svc  = require('./commission.service');

beforeEach(() => jest.clearAllMocks());

test('setujui komisi yang sudah Disetujui → 422 berbahasa Indonesia dengan label status', async () => {
  repo.findById.mockResolvedValue({ id: 'c1', status: 'APPROVED' });
  const err = await svc.approveCommission('c1', 'u1').catch((e) => e);
  expect(err.statusCode).toBe(422);
  expect(err.message).toContain('status sudah Disetujui');
  expect(err.message).not.toMatch(/Cannot|expected|APPROVED/);
});

test('status Dibayar juga memakai label Indonesia', async () => {
  repo.findById.mockResolvedValue({ id: 'c1', status: 'PAID' });
  await expect(svc.approveCommission('c1', 'u1')).rejects.toMatchObject({ message: expect.stringContaining('status sudah Dibayar') });
});
