'use strict';

/**
 * Unit tests — deposit.service.js
 * Business Rules: status guards (refund/cancel/delete/edit), customer ownership,
 *                 appointment ownership, withComputed derived fields
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: repository + side-effect services. Prisma.Decimal is real (via @prisma/client).
 */

jest.mock('./deposit.repository', () => ({
  findAll:              jest.fn(),
  count:                jest.fn(),
  findById:             jest.fn(),
  findCustomerById:     jest.fn(),
  findAppointmentById:  jest.fn(),
  create:               jest.fn(),
  updateStatus:         jest.fn(),
  updateDeposit:        jest.fn(),
  removeDeposit:        jest.fn(),
  updateAppointmentLink: jest.fn(),
}));

jest.mock('../syncQueue/syncQueue.service', () => ({
  createSyncJob: jest.fn().mockResolvedValue({}),
}));

jest.mock('./deposit.sync.service', () => ({
  updateDepositInAccurate:  jest.fn().mockResolvedValue({}),
  deleteDepositFromAccurate: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../config/prisma', () => ({
  deposit:        { aggregate: jest.fn() },
  depositPayment: { count:     jest.fn() },
}));

const repo     = require('./deposit.repository');
const prisma   = require('../../config/prisma');
const {
  getDepositById, createDeposit, refundDeposit, cancelDeposit, editDeposit, deleteDeposit,
} = require('./deposit.service');
const AppError = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

// shared minimal deposit shape (withComputed needs invoiceDeposits + amount)
const makeDeposit = (overrides = {}) => ({
  id:             'dep1',
  customerId:     'cust1',
  status:         'PAID',
  amount:         '500000',
  invoiceDeposits: [],
  accurateDepositId: null,
  ...overrides,
});

// ── getDepositById ────────────────────────────────────────────────────────────

describe('getDepositById', () => {
  test('should_return_deposit_with_computed_fields_when_found', async () => {
    repo.findById.mockResolvedValue(makeDeposit());

    const result = await getDepositById('dep1');

    expect(result.id).toBe('dep1');
    // withComputed adds usedAmount and remainingAmount
    expect(result.usedAmount).toBeDefined();
    expect(result.remainingAmount).toBeDefined();
  });

  test('should_throw_404_when_deposit_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(getDepositById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createDeposit ─────────────────────────────────────────────────────────────

describe('createDeposit', () => {
  const validBody = {
    customerId:  'cust1',
    amount:      '500000',
    branchId:    'br1',
    notes:       null,
  };

  beforeEach(() => {
    repo.findCustomerById.mockResolvedValue({ id: 'cust1', name: 'Nia' });
    repo.create.mockResolvedValue(makeDeposit({ status: 'UNPAID' }));
  });

  test('should_create_deposit_when_data_valid', async () => {
    const result = await createDeposit(validBody);

    expect(result.id).toBe('dep1');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('should_throw_404_when_customer_not_found', async () => {
    repo.findCustomerById.mockResolvedValue(null);

    await expect(createDeposit(validBody)).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('should_throw_404_when_appointment_not_found', async () => {
    repo.findAppointmentById.mockResolvedValue(null);

    await expect(createDeposit({ ...validBody, appointmentId: 'appt1' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_appointment_belongs_to_different_customer', async () => {
    repo.findAppointmentById.mockResolvedValue({ id: 'appt1', customerId: 'cust-other' });

    await expect(createDeposit({ ...validBody, appointmentId: 'appt1' })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_queue_accurate_sync_after_create', async () => {
    const { createSyncJob } = require('../syncQueue/syncQueue.service');

    await createDeposit(validBody);

    expect(createSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'DEPOSIT', direction: 'APP_TO_ACCURATE' })
    );
  });

  test('should_set_initial_status_to_UNPAID', async () => {
    await createDeposit(validBody);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'UNPAID' })
    );
  });
});

// ── refundDeposit ─────────────────────────────────────────────────────────────

describe('refundDeposit', () => {
  test('should_throw_404_when_deposit_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(refundDeposit('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_status_is_UNPAID', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'UNPAID' }));

    await expect(refundDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  test('should_throw_422_when_status_is_CANCELLED', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'CANCELLED' }));

    await expect(refundDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_refund_when_status_is_PAID', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PAID' }));
    repo.updateStatus.mockResolvedValue(makeDeposit({ status: 'REFUNDED' }));

    await refundDeposit('dep1');

    expect(repo.updateStatus).toHaveBeenCalledWith('dep1', 'REFUNDED');
  });

  test('should_refund_when_status_is_PARTIAL_USED', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PARTIAL_USED' }));
    repo.updateStatus.mockResolvedValue(makeDeposit({ status: 'REFUNDED' }));

    await refundDeposit('dep1');

    expect(repo.updateStatus).toHaveBeenCalledWith('dep1', 'REFUNDED');
  });
});

// ── cancelDeposit ─────────────────────────────────────────────────────────────

describe('cancelDeposit', () => {
  test('should_throw_404_when_deposit_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(cancelDeposit('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_status_is_PARTIAL_USED', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PARTIAL_USED' }));

    await expect(cancelDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_status_is_USED', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'USED' }));

    await expect(cancelDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_cancel_when_status_is_PAID', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PAID' }));
    repo.updateStatus.mockResolvedValue(makeDeposit({ status: 'CANCELLED' }));

    await cancelDeposit('dep1');

    expect(repo.updateStatus).toHaveBeenCalledWith('dep1', 'CANCELLED');
  });

  test('should_cancel_when_status_is_UNPAID', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'UNPAID' }));
    repo.updateStatus.mockResolvedValue(makeDeposit({ status: 'CANCELLED' }));

    await cancelDeposit('dep1');

    expect(repo.updateStatus).toHaveBeenCalledWith('dep1', 'CANCELLED');
  });
});

// ── editDeposit ───────────────────────────────────────────────────────────────

describe('editDeposit', () => {
  test('should_throw_404_when_deposit_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(editDeposit('missing', { notes: 'test' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_changing_amount_of_non_UNPAID_deposit', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PAID' }));

    await expect(editDeposit('dep1', { amount: '999000' })).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.updateDeposit).not.toHaveBeenCalled();
  });

  test('should_allow_amount_change_when_status_is_UNPAID', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'UNPAID' }));
    repo.updateDeposit.mockResolvedValue(makeDeposit({ amount: '999000' }));

    await editDeposit('dep1', { amount: '999000' });

    expect(repo.updateDeposit).toHaveBeenCalledWith('dep1', expect.objectContaining({ amount: expect.anything() }));
  });

  test('should_allow_notes_change_regardless_of_status', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PAID' }));
    repo.updateDeposit.mockResolvedValue(makeDeposit({ notes: 'Updated note' }));

    await editDeposit('dep1', { notes: 'Updated note' });

    expect(repo.updateDeposit).toHaveBeenCalledTimes(1);
  });
});

// ── deleteDeposit ─────────────────────────────────────────────────────────────

describe('deleteDeposit', () => {
  test('should_throw_404_when_deposit_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(deleteDeposit('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_422_when_deposit_has_invoice_deposits', async () => {
    repo.findById.mockResolvedValue(makeDeposit({
      status:          'PARTIAL_USED',
      invoiceDeposits: [{ id: 'id1', amountApplied: '100000' }],
    }));

    await expect(deleteDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.removeDeposit).not.toHaveBeenCalled();
  });

  test('should_throw_422_when_status_is_PAID', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'PAID', invoiceDeposits: [] }));

    await expect(deleteDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_status_is_USED', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'USED', invoiceDeposits: [] }));

    await expect(deleteDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('should_throw_422_when_has_deposit_payments', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'UNPAID', invoiceDeposits: [] }));
    prisma.depositPayment.count.mockResolvedValue(1);

    await expect(deleteDeposit('dep1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.removeDeposit).not.toHaveBeenCalled();
  });

  test('should_delete_when_status_is_UNPAID_and_no_relations', async () => {
    repo.findById.mockResolvedValue(makeDeposit({ status: 'UNPAID', invoiceDeposits: [] }));
    prisma.depositPayment.count.mockResolvedValue(0);
    repo.removeDeposit.mockResolvedValue({});

    await deleteDeposit('dep1');

    expect(repo.removeDeposit).toHaveBeenCalledWith('dep1');
  });
});
