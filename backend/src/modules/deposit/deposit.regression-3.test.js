'use strict';

// Regression: G1-28 — PATCH /deposits/:id/link-appointment tetap berhasil untuk deposit CANCELLED.
// Found by /qa on 2026-10-15

jest.mock('./deposit.repository', () => ({
  findById:              jest.fn(),
  findAppointmentById:   jest.fn(),
  updateAppointmentLink: jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('./deposit.sync.service', () => ({ updateDepositInAccurate: jest.fn(), deleteDepositFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./deposit.repository');
const { linkAppointmentToDeposit } = require('./deposit.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findAppointmentById.mockResolvedValue({ id: 'a1', customerId: 'c1' });
});

test('deposit CANCELLED → 422, tidak ditautkan', async () => {
  repo.findById.mockResolvedValue({ id: 'd1', status: 'CANCELLED', customerId: 'c1', amount: '1000' });
  await expect(linkAppointmentToDeposit('d1', 'a1')).rejects.toMatchObject({ statusCode: 422 });
  expect(repo.updateAppointmentLink).not.toHaveBeenCalled();
});

test('deposit PAID → boleh ditautkan', async () => {
  repo.findById.mockResolvedValue({ id: 'd1', status: 'PAID', customerId: 'c1', amount: '1000', invoiceDeposits: [] });
  repo.updateAppointmentLink.mockResolvedValue({ id: 'd1', status: 'PAID', amount: '1000', invoiceDeposits: [] });
  await linkAppointmentToDeposit('d1', 'a1');
  expect(repo.updateAppointmentLink).toHaveBeenCalledWith('d1', 'a1');
});
