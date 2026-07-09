'use strict';

/**
 * Unit tests — payment.service.js
 * Business Rules: invoice status guards, branch-match guard, payment method active check
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: repository + side-effect services. Prisma.Decimal is real (via @prisma/client).
 */

jest.mock('./payment.repository', () => ({
  findAll:                jest.fn(),
  count:                  jest.fn(),
  findById:               jest.fn(),
  findPaymentById:        jest.fn(),
  countToday:             jest.fn(),
  findInvoiceForPayment:  jest.fn(),
  findInvoiceForDelete:   jest.fn(),
  findPaymentMethodById:  jest.fn(),
  createWithTransaction:  jest.fn(),
  deleteWithTransaction:  jest.fn(),
}));

jest.mock('../invoice/invoice.workflow', () => ({
  handleInvoicePaid: jest.fn().mockResolvedValue({}),
}));

jest.mock('../syncQueue/syncQueue.service', () => ({
  createSyncJob: jest.fn().mockResolvedValue({}),
}));

jest.mock('./payment.sync.service', () => ({
  deletePaymentFromAccurate: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../config/prisma', () => ({
  payment: { aggregate: jest.fn() },
}));

const repo     = require('./payment.repository');
const { getPaymentById, createPayment, deletePayment } = require('./payment.service');
const AppError = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

// ── getPaymentById ────────────────────────────────────────────────────────────

describe('getPaymentById', () => {
  test('should_return_payment_when_found', async () => {
    const mockPayment = { id: 'pay1', amount: '100000', invoiceId: 'inv1' };
    repo.findById.mockResolvedValue(mockPayment);

    const result = await getPaymentById('pay1');

    expect(result).toEqual(mockPayment);
  });

  test('should_throw_404_when_payment_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(getPaymentById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createPayment ─────────────────────────────────────────────────────────────

describe('createPayment', () => {
  const baseInvoice = {
    id:             'inv1',
    status:         'UNPAID',
    branchId:       'br1',
    grandTotal:     '500000',
    paidAmount:     '0',
    totalDeposit:   '0',
  };
  const baseMethod = { id: 'pm1', name: 'Cash', isActive: true };
  const baseBody = {
    invoiceId:       'inv1',
    paymentMethodId: 'pm1',
    amount:          '200000',
    branchId:        'br1',
  };

  beforeEach(() => {
    repo.findInvoiceForPayment.mockResolvedValue(baseInvoice);
    repo.findPaymentMethodById.mockResolvedValue(baseMethod);
    repo.countToday.mockResolvedValue(0);
    repo.createWithTransaction.mockResolvedValue({ id: 'pay1' });
    repo.findPaymentById.mockResolvedValue({ id: 'pay1', ...baseBody });
  });

  test('should_throw_404_when_invoice_not_found', async () => {
    repo.findInvoiceForPayment.mockResolvedValue(null);

    await expect(createPayment(baseBody, 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_invoice_is_cancelled', async () => {
    repo.findInvoiceForPayment.mockResolvedValue({ ...baseInvoice, status: 'CANCELLED' });

    await expect(createPayment(baseBody, 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.createWithTransaction).not.toHaveBeenCalled();
  });

  test('should_throw_422_when_invoice_is_already_paid', async () => {
    repo.findInvoiceForPayment.mockResolvedValue({ ...baseInvoice, status: 'PAID' });

    await expect(createPayment(baseBody, 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.createWithTransaction).not.toHaveBeenCalled();
  });

  test('should_throw_403_when_branch_does_not_match_invoice', async () => {
    const body = { ...baseBody, branchId: 'br-other' };

    await expect(createPayment(body, 'u1')).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.createWithTransaction).not.toHaveBeenCalled();
  });

  test('should_throw_404_when_payment_method_not_found', async () => {
    repo.findPaymentMethodById.mockResolvedValue(null);

    await expect(createPayment(baseBody, 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_payment_method_is_inactive', async () => {
    repo.findPaymentMethodById.mockResolvedValue({ ...baseMethod, isActive: false });

    await expect(createPayment(baseBody, 'u1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_create_payment_when_all_valid', async () => {
    await createPayment(baseBody, 'u1');

    expect(repo.createWithTransaction).toHaveBeenCalledTimes(1);
  });

  test('should_mark_invoice_paid_when_payment_covers_grand_total', async () => {
    const { handleInvoicePaid } = require('../invoice/invoice.workflow');
    // payment = 500000 = grandTotal → invoice becomes PAID
    const body = { ...baseBody, amount: '500000' };

    await createPayment(body, 'u1');

    expect(handleInvoicePaid).toHaveBeenCalledWith('inv1', 'u1');
  });

  test('should_not_call_handleInvoicePaid_when_invoice_still_outstanding', async () => {
    const { handleInvoicePaid } = require('../invoice/invoice.workflow');
    // payment = 200000 < 500000 → still UNPAID
    await createPayment(baseBody, 'u1');

    expect(handleInvoicePaid).not.toHaveBeenCalled();
  });

  test('should_queue_accurate_sync_after_create', async () => {
    const { createSyncJob } = require('../syncQueue/syncQueue.service');
    await createPayment(baseBody, 'u1');

    expect(createSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'PAYMENT', direction: 'APP_TO_ACCURATE' })
    );
  });
});

// ── deletePayment ─────────────────────────────────────────────────────────────

describe('deletePayment', () => {
  test('should_throw_404_when_payment_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(deletePayment('missing', 'u1')).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.deleteWithTransaction).not.toHaveBeenCalled();
  });

  test('should_delete_payment_when_found', async () => {
    repo.findById.mockResolvedValue({ id: 'pay1', invoiceId: 'inv1', accurateReceiptId: null });
    repo.findInvoiceForDelete.mockResolvedValue({ id: 'inv1', status: 'UNPAID', paidAmount: '200000' });
    repo.deleteWithTransaction.mockResolvedValue({});

    await deletePayment('pay1', 'u1');

    expect(repo.deleteWithTransaction).toHaveBeenCalledTimes(1);
  });
});
