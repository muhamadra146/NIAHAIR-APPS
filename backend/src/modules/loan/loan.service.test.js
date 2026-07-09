'use strict';

jest.mock('./loan.repository');

const repo = require('./loan.repository');
const svc  = require('./loan.service');

const LOAN = {
  id: 'ln1', status: 'ACTIVE',
  employeeId: 'e1', totalAmount: 5000000,
  remainingAmount: 3000000, monthlyDeduction: 500000,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([LOAN]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns loan when found', async () => {
    repo.findById.mockResolvedValue(LOAN);
    await expect(svc.getById('ln1')).resolves.toEqual(LOAN);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createLoan ─────────────────────────────────────────────────────────

describe('createLoan', () => {
  test('creates loan with auto loanNo and remainingAmount = totalAmount', async () => {
    repo.generateLoanNo.mockResolvedValue('KSB-000001');
    repo.create.mockResolvedValue({ ...LOAN, loanNo: 'KSB-000001' });

    const result = await svc.createLoan({
      employeeId: 'e1', branchId: 'b1',
      totalAmount: 5000000, monthlyDeduction: 500000,
      startDate: '2024-06-01',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ loanNo: 'KSB-000001', remainingAmount: 5000000 })
    );
    expect(result).toBeDefined();
  });

  test('converts startDate string to Date', async () => {
    repo.generateLoanNo.mockResolvedValue('KSB-000001');
    repo.create.mockResolvedValue(LOAN);

    await svc.createLoan({ employeeId: 'e1', totalAmount: 5000000, monthlyDeduction: 500000, startDate: '2024-06-01' });
    const callArg = repo.create.mock.calls[0][0];
    expect(callArg.startDate).toBeInstanceOf(Date);
  });
});

// ── updateLoan ─────────────────────────────────────────────────────────

describe('updateLoan', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateLoan('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when loan is not ACTIVE', async () => {
    repo.findById.mockResolvedValue({ ...LOAN, status: 'PAID_OFF' });
    await expect(svc.updateLoan('ln1', { notes: 'test' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates allowed fields on ACTIVE loan', async () => {
    repo.findById.mockResolvedValue(LOAN);
    repo.update.mockResolvedValue({ ...LOAN, notes: 'updated' });

    const result = await svc.updateLoan('ln1', { monthlyDeduction: 400000, notes: 'updated' });
    expect(repo.update).toHaveBeenCalledWith('ln1', expect.objectContaining({ monthlyDeduction: 400000 }));
    expect(result.notes).toBe('updated');
  });
});

// ── cancelLoan ─────────────────────────────────────────────────────────

describe('cancelLoan', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.cancelLoan('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when loan is not ACTIVE', async () => {
    repo.findById.mockResolvedValue({ ...LOAN, status: 'CANCELLED' });
    await expect(svc.cancelLoan('ln1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cancels ACTIVE loan', async () => {
    repo.findById.mockResolvedValue(LOAN);
    repo.update.mockResolvedValue({ ...LOAN, status: 'CANCELLED' });

    const result = await svc.cancelLoan('ln1');
    expect(repo.update).toHaveBeenCalledWith('ln1', { status: 'CANCELLED' });
    expect(result.status).toBe('CANCELLED');
  });
});

// ── addRepayment ───────────────────────────────────────────────────────

describe('addRepayment', () => {
  test('throws 404 when loan not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.addRepayment('x', { amount: 500000, paidAt: '2024-06-01' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when loan is not ACTIVE', async () => {
    repo.findById.mockResolvedValue({ ...LOAN, status: 'PAID_OFF' });
    await expect(svc.addRepayment('ln1', { amount: 500000, paidAt: '2024-06-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when amount is zero or negative', async () => {
    repo.findById.mockResolvedValue(LOAN);
    await expect(svc.addRepayment('ln1', { amount: 0, paidAt: '2024-06-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when amount exceeds remaining balance', async () => {
    repo.findById.mockResolvedValue({ ...LOAN, remainingAmount: 100 });
    await expect(svc.addRepayment('ln1', { amount: 500000, paidAt: '2024-06-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('records repayment on valid amount', async () => {
    repo.findById.mockResolvedValue(LOAN);
    repo.addRepayment.mockResolvedValue({ id: 'rp1', amount: 500000 });

    const result = await svc.addRepayment('ln1', { amount: 500000, paidAt: '2024-06-01' });
    expect(repo.addRepayment).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
