'use strict';

// Regression: G1-12 — GET /appointments/:appointmentId/deposits mengabaikan param dan
// mengembalikan deposit milik booking lain.
// Found by /qa on 2026-10-15

jest.mock('./deposit.service', () => ({ listDeposits: jest.fn().mockResolvedValue({ data: [], meta: {} }) }));
jest.mock('../../common/responses/apiResponse', () => ({ success: jest.fn(), created: jest.fn() }));

const { listDeposits }     = require('./deposit.service');
const { getAllController } = require('./deposit.controller');

test('appointmentId dari route param dipakai sebagai filter', async () => {
  const req = { params: { appointmentId: 'appt-1' }, query: { limit: '5' } };
  await getAllController(req, {}, jest.fn());
  expect(listDeposits).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'appt-1', limit: '5' }));
});

test('route param menang atas query appointmentId', async () => {
  const req = { params: { appointmentId: 'appt-1' }, query: { appointmentId: 'appt-2' } };
  await getAllController(req, {}, jest.fn());
  expect(listDeposits).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'appt-1' }));
});

test('tanpa route param (GET /deposits) query tetap dipakai', async () => {
  const req = { params: {}, query: { appointmentId: 'appt-2' } };
  await getAllController(req, {}, jest.fn());
  expect(listDeposits).toHaveBeenCalledWith({ appointmentId: 'appt-2' });
});
