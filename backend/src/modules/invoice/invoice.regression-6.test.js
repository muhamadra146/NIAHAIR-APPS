'use strict';

// Regression: G1-14 — POST /invoices menerima appointmentId yang tidak ada atau milik pelanggan lain.
// Found by /qa on 2026-10-15

jest.mock('./invoice.repository', () => ({
  findCustomerById:      jest.fn(),
  findAppointmentById:   jest.fn(),
  findBranchById:        jest.fn(),
  createWithTransaction: jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../inventory/inventory.service', () => ({
  generateSaleMovement: jest.fn(), reverseInvoiceSaleMovements: jest.fn(), reverseInvoiceServiceMovements: jest.fn(),
}));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./invoice.workflow', () => ({ handleInvoicePaid: jest.fn() }));
jest.mock('../membership/membership.service', () => ({ getActiveMembership: jest.fn() }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./invoice.repository');
const { createInvoice } = require('./invoice.service');

const body = { customerId: 'c1', appointmentId: 'a1', items: [{ itemId: 'i1', unitId: 'u1', qty: 1 }] };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
});

test('booking tidak ada → 404', async () => {
  repo.findAppointmentById.mockResolvedValue(null);
  await expect(createInvoice(body, 'u1', 'b1')).rejects.toMatchObject({ statusCode: 404, message: 'Booking tidak ditemukan' });
  expect(repo.createWithTransaction).not.toHaveBeenCalled();
});

test('booking milik pelanggan lain → 422', async () => {
  repo.findAppointmentById.mockResolvedValue({ id: 'a1', customerId: 'c2' });
  await expect(createInvoice(body, 'u1', 'b1')).rejects.toMatchObject({ statusCode: 422, message: 'Booking bukan milik pelanggan ini' });
  expect(repo.createWithTransaction).not.toHaveBeenCalled();
});
