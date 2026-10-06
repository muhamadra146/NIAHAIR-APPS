'use strict';

/**
 * Unit tests — invoice.service.js
 * Business Rules: status guards (cancel/delete), deposit application validations
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: repository + side-effect services. Prisma.Decimal is real (via @prisma/client).
 */

jest.mock('./invoice.repository', () => ({
  findTreatmentItemsForJobLimit: jest.fn().mockResolvedValue([]),
  findAll:                       jest.fn(),
  count:                         jest.fn(),
  findById:                      jest.fn(),
  countToday:                    jest.fn(),
  findCustomerById:              jest.fn(),
  findBranchById:                jest.fn(),
  findItemById:                  jest.fn(),
  findItemUnit:                  jest.fn(),
  findActivePrice:               jest.fn(),
  findActivePriceGlobal:         jest.fn(),
  findTreatmentSessionsByIds:    jest.fn(),
  findDepositsByIds:             jest.fn(),
  findDepositForApply:           jest.fn(),
  findInvoiceForDepositApply:    jest.fn(),
  createWithTransaction:         jest.fn(),
  applyDepositWithTransaction:   jest.fn(),
  updateWithTransaction:         jest.fn(),
  cancelWithTransaction:         jest.fn(),
  deleteWithTransaction:         jest.fn(),
  findMaxInvoiceSeqToday:        jest.fn(),
  findDailyAssignment:           jest.fn(),
}));

jest.mock('../syncQueue/syncQueue.service', () => ({
  createSyncJob: jest.fn().mockResolvedValue({}),
}));

jest.mock('../inventory/inventory.service', () => ({
  generateSaleMovement:           jest.fn().mockResolvedValue({}),
  reverseInvoiceSaleMovements:    jest.fn().mockResolvedValue({}),
  reverseInvoiceServiceMovements: jest.fn().mockResolvedValue({}),
}));

jest.mock('../accurate/accurate.client', () => ({
  accurateRequest: jest.fn(),
}));

jest.mock('./invoice.workflow', () => ({
  handleInvoicePaid: jest.fn().mockResolvedValue({}),
}));

jest.mock('../membership/membership.service', () => ({
  getActiveMembership: jest.fn().mockResolvedValue(null),
}));

jest.mock('../consultation/consultation.repository', () => ({
  findByInvoiceId: jest.fn(),
}));

jest.mock('../treatment/treatmentJobAssignment.repository', () => ({
  upsertMany: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../config/prisma', () => ({
  payment:          { count: jest.fn() },
  invoice:          { findUnique: jest.fn() },
  treatmentSession: { findFirst: jest.fn(), delete: jest.fn(), create: jest.fn() },
  $transaction:     jest.fn(),
}));

const repo      = require('./invoice.repository');
const prisma    = require('../../config/prisma');
const inventory = require('../inventory/inventory.service');
const { getInvoiceById, cancelInvoice, deleteInvoice, applyDepositToInvoice, submitJobAssignments } =
  require('./invoice.service');
const consultationRepo = require('../consultation/consultation.repository');
const { upsertMany }   = require('../treatment/treatmentJobAssignment.repository');
const AppError  = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

// ── getInvoiceById ────────────────────────────────────────────────────────────

describe('getInvoiceById', () => {
  test('should_return_invoice_when_found', async () => {
    const mockInvoice = { id: 'inv1', status: 'UNPAID', grandTotal: '500000' };
    repo.findById.mockResolvedValue(mockInvoice);

    const result = await getInvoiceById('inv1');

    expect(result).toEqual(mockInvoice);
    expect(repo.findById).toHaveBeenCalledWith('inv1');
  });

  test('should_throw_404_when_invoice_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(getInvoiceById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── cancelInvoice ─────────────────────────────────────────────────────────────

describe('cancelInvoice', () => {
  test('should_throw_404_when_invoice_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(cancelInvoice('missing', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_invoice_is_paid', async () => {
    repo.findById.mockResolvedValue({ id: 'inv1', status: 'PAID' });

    await expect(cancelInvoice('inv1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.cancelWithTransaction).not.toHaveBeenCalled();
  });

  test('should_throw_422_when_invoice_already_cancelled', async () => {
    repo.findById.mockResolvedValue({ id: 'inv1', status: 'CANCELLED' });

    await expect(cancelInvoice('inv1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.cancelWithTransaction).not.toHaveBeenCalled();
  });

  test('should_cancel_unpaid_invoice', async () => {
    const mockInvoice = { id: 'inv1', invoiceNo: 'INV-001', status: 'UNPAID' };
    repo.findById.mockResolvedValue(mockInvoice);
    repo.cancelWithTransaction.mockResolvedValue({ ...mockInvoice, status: 'CANCELLED' });

    await cancelInvoice('inv1', 'u1');

    expect(inventory.reverseInvoiceSaleMovements).toHaveBeenCalledWith('INV-001');
    expect(repo.cancelWithTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ invoice: mockInvoice, userId: 'u1' })
    );
  });
});

// ── deleteInvoice ─────────────────────────────────────────────────────────────

describe('deleteInvoice', () => {
  test('should_throw_404_when_invoice_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(deleteInvoice('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_invoice_is_paid', async () => {
    repo.findById.mockResolvedValue({ id: 'inv1', status: 'PAID', accurateInvoiceId: null });

    await expect(deleteInvoice('inv1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.deleteWithTransaction).not.toHaveBeenCalled();
  });

  test('should_throw_422_when_invoice_has_payments', async () => {
    repo.findById.mockResolvedValue({ id: 'inv1', status: 'UNPAID', accurateInvoiceId: null });
    prisma.payment.count.mockResolvedValue(2);

    await expect(deleteInvoice('inv1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.deleteWithTransaction).not.toHaveBeenCalled();
  });

  test('should_delete_invoice_when_no_payments_and_unpaid', async () => {
    repo.findById.mockResolvedValue({ id: 'inv1', invoiceNo: 'INV-001', status: 'UNPAID', accurateInvoiceId: null });
    prisma.payment.count.mockResolvedValue(0);
    repo.deleteWithTransaction.mockResolvedValue({});

    await deleteInvoice('inv1');

    expect(inventory.reverseInvoiceSaleMovements).toHaveBeenCalledWith('INV-001');
    expect(inventory.reverseInvoiceServiceMovements).toHaveBeenCalledWith('inv1');
    expect(repo.deleteWithTransaction).toHaveBeenCalledWith('inv1');
  });
});

// ── applyDepositToInvoice ─────────────────────────────────────────────────────

describe('applyDepositToInvoice', () => {
  const baseInvoice = {
    id:               'inv1',
    status:           'UNPAID',
    customerId:       'cust1',
    totalDeposit:     '0',
    outstandingAmount: '500000',
  };
  const baseDeposit = {
    id:             'dep1',
    customerId:     'cust1',
    status:         'PAID',
    amount:         '600000',
    invoiceDeposits: [],
  };

  beforeEach(() => {
    repo.findInvoiceForDepositApply.mockResolvedValue(baseInvoice);
    repo.findDepositForApply.mockResolvedValue(baseDeposit);
    repo.applyDepositWithTransaction.mockResolvedValue({ id: 'inv1', status: 'UNPAID' });
  });

  test('should_throw_404_when_invoice_not_found', async () => {
    repo.findInvoiceForDepositApply.mockResolvedValue(null);

    await expect(
      applyDepositToInvoice('missing', { depositId: 'dep1', amount: '100000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_invoice_is_paid', async () => {
    repo.findInvoiceForDepositApply.mockResolvedValue({ ...baseInvoice, status: 'PAID' });

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '100000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_invoice_is_cancelled', async () => {
    repo.findInvoiceForDepositApply.mockResolvedValue({ ...baseInvoice, status: 'CANCELLED' });

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '100000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_404_when_deposit_not_found', async () => {
    repo.findDepositForApply.mockResolvedValue(null);

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'missing', amount: '100000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_deposit_status_is_not_usable', async () => {
    repo.findDepositForApply.mockResolvedValue({ ...baseDeposit, status: 'UNPAID' });

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '100000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_deposit_belongs_to_different_customer', async () => {
    repo.findDepositForApply.mockResolvedValue({ ...baseDeposit, customerId: 'cust-other' });

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '100000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_amount_is_zero', async () => {
    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '0' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_amount_exceeds_deposit_remaining', async () => {
    // deposit amount = 100000, alreadyUsed = 0, remaining = 100000
    // but we try to apply 200000
    repo.findDepositForApply.mockResolvedValue({ ...baseDeposit, amount: '100000', invoiceDeposits: [] });

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '200000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_amount_exceeds_invoice_outstanding', async () => {
    // outstanding = 100000 but we try to apply 600000
    repo.findInvoiceForDepositApply.mockResolvedValue({ ...baseInvoice, outstandingAmount: '100000' });

    await expect(
      applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '200000' }, 'u1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_apply_deposit_and_update_invoice_when_valid', async () => {
    await applyDepositToInvoice('inv1', { depositId: 'dep1', amount: '100000' }, 'u1');

    expect(repo.applyDepositWithTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'inv1', depositId: 'dep1' })
    );
  });
});

// ── submitJobAssignments — COM-014: Catatan Klien wajib sebelum Input Job ─────

describe('submitJobAssignments', () => {
  const tx = {
    invoice:    { findUnique: jest.fn() },
    commission: { findMany: jest.fn(), deleteMany: jest.fn() },
  };
  const sessions = [{ sessionId: 's1', assignments: [{ treatmentItemId: 'ti1', commissionJobId: 'j1', employeeId: 'e1' }] }];

  beforeEach(() => {
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    tx.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'PAID' });
    tx.commission.findMany.mockResolvedValue([]);
  });

  test('should_reject_when_consultation_note_missing', async () => {
    consultationRepo.findByInvoiceId.mockResolvedValue(null);
    await expect(submitJobAssignments('inv1', sessions))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(upsertMany).not.toHaveBeenCalled();
  });

  test('should_save_assignments_when_consultation_note_exists', async () => {
    consultationRepo.findByInvoiceId.mockResolvedValue({ id: 'note1' });
    const result = await submitJobAssignments('inv1', sessions);
    expect(upsertMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ assigned: 1 });
  });
});

describe('submitJobAssignments — COM-015 batas qty', () => {
  const tx = {
    invoice:    { findUnique: jest.fn() },
    commission: { findMany: jest.fn(), deleteMany: jest.fn() },
  };
  const item = {
    id: 'ti1', qty: 1, conversionSnapshot: 120,
    item: { name: 'ALMOST HITAM 50CM', commissionCategory: { jobs: [
      { id: 'pasang', name: 'pasang rambut', unit: 'helai', splitMode: 'BY_QTY', deductsFromJobId: null },
    ] } },
  };
  const two = (q1, q2) => [{ sessionId: 's1', assignments: [
    { treatmentItemId: 'ti1', commissionJobId: 'pasang', employeeId: 'e1', workQty: q1 },
    { treatmentItemId: 'ti1', commissionJobId: 'pasang', employeeId: 'e2', workQty: q2 },
  ] }];

  beforeEach(() => {
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    tx.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'PAID' });
    tx.commission.findMany.mockResolvedValue([]);
    consultationRepo.findByInvoiceId.mockResolvedValue({ id: 'note1' });
    repo.findTreatmentItemsForJobLimit.mockResolvedValue([item]);
  });

  test('should_reject_when_team_total_exceeds_invoice_qty', async () => {
    await expect(submitJobAssignments('inv1', two(120, 120)))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(upsertMany).not.toHaveBeenCalled();
  });

  test('should_save_when_team_total_within_invoice_qty', async () => {
    await submitJobAssignments('inv1', two(70, 50));
    expect(upsertMany).toHaveBeenCalledTimes(1);
  });
});
