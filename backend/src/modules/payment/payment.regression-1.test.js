'use strict';

// Regression: G1-08 — pembayaran invoice melebihi sisa tagihan diterima (lebih bayar tercatat).
// Keputusan owner: tolak 422; uang kembalian ditangani kasir, tidak dicatat.
// Found by /qa on 2026-10-15

jest.mock('./payment.repository', () => ({
  findPaymentById:       jest.fn(),
  findLastNumber:        jest.fn().mockResolvedValue(null),
  findInvoiceForPayment: jest.fn(),
  findPaymentMethodById: jest.fn(),
  createWithTransaction: jest.fn(),
}));
jest.mock('../invoice/invoice.workflow', () => ({ handleInvoicePaid: jest.fn() }));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('./payment.sync.service', () => ({ deletePaymentFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./payment.repository');
const { createPayment } = require('./payment.service');

beforeEach(() => {
  jest.clearAllMocks();
  // Sisa tagihan = 300.000 − 100.000 (deposit) − 50.000 (sudah bayar) = 150.000
  repo.findInvoiceForPayment.mockResolvedValue({
    id: 'inv1', status: 'PARTIAL', branchId: 'b1',
    grandTotal: '300000', totalDeposit: '100000', paidAmount: '50000', outstandingAmount: '150000',
  });
  repo.findPaymentMethodById.mockResolvedValue({ id: 'pm1', isActive: true });
  repo.createWithTransaction.mockResolvedValue({ id: 'pay1' });
});

const pay = (amount) => createPayment({ invoiceId: 'inv1', paymentMethodId: 'pm1', amount, branchId: 'b1' }, 'u1');

test('melebihi sisa tagihan → 422 dengan nominal sisa', async () => {
  await expect(pay(150001)).rejects.toMatchObject({
    statusCode: 422,
    message:    'Pembayaran melebihi sisa tagihan (Rp 150.000)',
  });
  expect(repo.createWithTransaction).not.toHaveBeenCalled();
});

test('tepat sebesar sisa tagihan → diterima & invoice PAID', async () => {
  await pay(150000);
  expect(repo.createWithTransaction).toHaveBeenCalledWith(expect.objectContaining({ newStatus: 'PAID' }));
});
