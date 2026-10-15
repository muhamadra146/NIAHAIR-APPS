'use strict';

// Regression: G1-03 / G1-04 — batal (PATCH /invoices/:id/cancel) dan hapus (DELETE /invoices/:id)
// tidak melepas deposit: status deposit tetap PARTIAL_USED/USED & invoice batal tetap memegang totalDeposit.
// Found by /qa on 2026-10-15

// Fake transaction client — dipakai repository asli
const mockTx = {
  invoiceDeposit: { findMany: jest.fn(), deleteMany: jest.fn() },
  deposit:        { findMany: jest.fn(), update: jest.fn() },
  invoice:        { update: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  invoiceStatusHistory: { create: jest.fn(), deleteMany: jest.fn() },
  treatmentSession: { findMany: jest.fn().mockResolvedValue([]) },
  commission:     { deleteMany: jest.fn() },
  overtimeCharge: { findMany: jest.fn().mockResolvedValue([]) },
  clientConsultationNote: { deleteMany: jest.fn() },
  payment:        { deleteMany: jest.fn() },
  invoiceItem:    { deleteMany: jest.fn() },
};
jest.mock('../../config/prisma', () => ({
  $transaction: jest.fn((fn) => fn(mockTx)),
  payment:      { count: jest.fn().mockResolvedValue(0) },
  invoice:      { update: jest.fn() },
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
jest.mock('../commission/commission.repository', () => ({ JOB_CALC_SELECT: {} }));

const prisma = require('../../config/prisma');
const { cancelInvoice, deleteInvoice } = require('./invoice.service');

const INVOICE = {
  id: 'inv1', invoiceNo: 'INV-1', status: 'PARTIAL', grandTotal: '300000',
  totalDeposit: '100000', paidAmount: '50000', accurateInvoiceId: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.invoice.findUnique = jest.fn().mockResolvedValue(INVOICE);
  mockTx.invoice.findUnique.mockResolvedValue({ ...INVOICE, status: 'CANCELLED' });
  mockTx.invoiceDeposit.findMany.mockResolvedValue([{ depositId: 'd1' }, { depositId: 'd2' }, { depositId: 'd3' }]);
  mockTx.deposit.findMany.mockResolvedValue([
    // d1: hanya dipakai invoice ini → kembali PAID
    { id: 'd1', amount: '100000', status: 'USED',         invoiceDeposits: [] },
    // d2: masih dipakai invoice lain sebagian → PARTIAL_USED
    { id: 'd2', amount: '500000', status: 'USED',         invoiceDeposits: [{ amountApplied: '200000' }] },
    // d3: sudah di-refund → tidak disentuh
    { id: 'd3', amount: '100000', status: 'REFUNDED',     invoiceDeposits: [] },
  ]);
});

// findById di repository asli memakai prisma.invoice.findUnique
const statusUpdates = () => Object.fromEntries(mockTx.deposit.update.mock.calls.map(([a]) => [a.where.id, a.data.status]));

test('cancel melepas deposit & menghitung ulang status dalam transaksi yang sama', async () => {
  await cancelInvoice('inv1', 'u1');

  expect(mockTx.invoiceDeposit.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: 'inv1' } });
  expect(statusUpdates()).toEqual({ d1: 'PAID', d2: 'PARTIAL_USED' });

  const upd = mockTx.invoice.update.mock.calls[0][0];
  expect(upd.data.status).toBe('CANCELLED');
  expect(String(upd.data.totalDeposit)).toBe('0');
  expect(String(upd.data.outstandingAmount)).toBe('250000');
});

test('delete melepas deposit & menghitung ulang status', async () => {
  await deleteInvoice('inv1');

  expect(mockTx.invoiceDeposit.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: 'inv1' } });
  expect(statusUpdates()).toEqual({ d1: 'PAID', d2: 'PARTIAL_USED' });
  expect(mockTx.invoice.delete).toHaveBeenCalled();
});

test('deposit habis dipakai invoice lain tetap USED', async () => {
  mockTx.deposit.findMany.mockResolvedValue([
    { id: 'd1', amount: '100000', status: 'PARTIAL_USED', invoiceDeposits: [{ amountApplied: '100000' }] },
  ]);
  await cancelInvoice('inv1', 'u1');
  expect(statusUpdates()).toEqual({ d1: 'USED' });
});
