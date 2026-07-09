'use strict';

jest.mock('@prisma/client', () => ({
  Prisma: {
    Decimal: class Decimal {
      constructor(v) { this._v = parseFloat(String(v)); }
      toString() { return String(this._v); }
    },
  },
}));

jest.mock('./depositPayment.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('./depositPayment.sync.service');
jest.mock('../../config/prisma', () => ({
  depositPayment: { aggregate: jest.fn() },
}));

const repo          = require('./depositPayment.repository');
const { createSyncJob }                      = require('../syncQueue/syncQueue.service');
const { deleteDepositPaymentFromAccurate }   = require('./depositPayment.sync.service');
const svc           = require('./depositPayment.service');

const DEPOSIT_UNPAID = { id: 'd1', status: 'UNPAID', amount: '500000' };
const PAYMENT_METHOD_ACTIVE = { id: 'pm1', code: 'CASH', isActive: true };
const DP = { id: 'dp1', depositId: 'd1', amount: '500000', paymentNo: 'DPAY-20240601-0001', accurateReceiptId: null };

beforeEach(() => jest.clearAllMocks());

// ── listDepositPayments ────────────────────────────────────────────────

describe('listDepositPayments', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([DP]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listDepositPayments({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getDepositPaymentById ──────────────────────────────────────────────

describe('getDepositPaymentById', () => {
  test('returns payment when found', async () => {
    repo.findById.mockResolvedValue(DP);
    await expect(svc.getDepositPaymentById('dp1')).resolves.toEqual(DP);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getDepositPaymentById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createDepositPayment ───────────────────────────────────────────────

describe('createDepositPayment', () => {
  beforeEach(() => {
    repo.findDepositForPayment.mockResolvedValue(DEPOSIT_UNPAID);
    repo.findPaymentMethodById.mockResolvedValue(PAYMENT_METHOD_ACTIVE);
    repo.countToday.mockResolvedValue(0);
    repo.create.mockResolvedValue(DP);
    repo.markDepositPaid.mockResolvedValue(undefined);
    repo.findById.mockResolvedValue(DP);
    createSyncJob.mockResolvedValue(undefined);
  });

  test('throws 404 when deposit not found', async () => {
    repo.findDepositForPayment.mockResolvedValue(null);
    await expect(svc.createDepositPayment({ depositId: 'bad', paymentMethodId: 'pm1' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when deposit status is PAID', async () => {
    repo.findDepositForPayment.mockResolvedValue({ ...DEPOSIT_UNPAID, status: 'PAID' });
    await expect(svc.createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 404 when payment method not found', async () => {
    repo.findPaymentMethodById.mockResolvedValue(null);
    await expect(svc.createDepositPayment({ depositId: 'd1', paymentMethodId: 'bad' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when payment method is inactive', async () => {
    repo.findPaymentMethodById.mockResolvedValue({ ...PAYMENT_METHOD_ACTIVE, isActive: false });
    await expect(svc.createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('creates payment, marks deposit PAID, and queues sync', async () => {
    const result = await svc.createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ paymentNo: expect.stringMatching(/^DPAY-/) }));
    expect(repo.markDepositPaid).toHaveBeenCalledWith('d1', expect.any(Date));
    expect(createSyncJob).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'DEPOSIT_PAYMENT' }));
    expect(result).toEqual(DP);
  });
});

// ── deleteDepositPayment ───────────────────────────────────────────────

describe('deleteDepositPayment', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteDepositPayment('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('deletes payment and reverts deposit to UNPAID', async () => {
    repo.findById.mockResolvedValue(DP);
    repo.removeDepositPayment.mockResolvedValue(undefined);
    repo.revertDepositToUnpaid.mockResolvedValue(undefined);

    const result = await svc.deleteDepositPayment('dp1');
    expect(repo.removeDepositPayment).toHaveBeenCalledWith('dp1');
    expect(repo.revertDepositToUnpaid).toHaveBeenCalledWith('d1');
    expect(result).toEqual({ deleted: true });
  });

  test('calls Accurate delete when accurateReceiptId exists', async () => {
    repo.findById.mockResolvedValue({ ...DP, accurateReceiptId: 'acc123' });
    repo.removeDepositPayment.mockResolvedValue(undefined);
    repo.revertDepositToUnpaid.mockResolvedValue(undefined);
    deleteDepositPaymentFromAccurate.mockResolvedValue(undefined);

    await svc.deleteDepositPayment('dp1');
    expect(deleteDepositPaymentFromAccurate).toHaveBeenCalledWith('acc123');
  });
});
