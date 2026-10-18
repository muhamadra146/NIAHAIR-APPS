'use strict';

// Regression — found by UI QA 2026-10-18 (kasbon: tanggal tidak nyata, tanggal angsuran, batas nominal)
jest.mock('./loan.repository');
jest.mock('../notification/notification.service', () => ({ loanCreated: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn((fn) => fn('tx')) }));

const { safeParse } = require('valibot');
const repo = require('./loan.repository');
const svc  = require('./loan.service');
const { createLoanSchema, addRepaymentSchema, MAX_LOAN_AMOUNT } = require('./loan.validation');
const { wibDateStr } = require('../../utils/date');

const BODY = {
  employeeId: 'e1', branchId: 'b1', totalAmount: 1000000, monthlyDeduction: 250000, startDate: '2026-01-10',
};
const LOAN = {
  id: 'ln1', status: 'ACTIVE', totalAmount: '1000000', remainingAmount: '1000000',
  startDate: new Date('2026-01-10T00:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.generateLoanNo.mockResolvedValue('KB-1');
  repo.create.mockImplementation(async (d) => ({ id: 'ln1', ...d }));
  repo.findById.mockResolvedValue(LOAN);
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
  repo.addRepayment.mockResolvedValue({ id: 'r1' });
});

describe('tanggal kalender nyata', () => {
  test('create: tanggal mulai 2026-02-31 ditolak (tidak digeser ke Maret)', async () => {
    await expect(svc.createLoan({ ...BODY, startDate: '2026-02-31' }))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('tidak ada di kalender') });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('create: tanggal selesai 2026-04-31 ditolak', async () => {
    await expect(svc.createLoan({ ...BODY, endDate: '2026-04-31' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('create: format bukan tanggal ditolak', async () => {
    await expect(svc.createLoan({ ...BODY, startDate: 'besok' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('create: 2028-02-29 (kabisat) diterima, disimpan apa adanya', async () => {
    await svc.createLoan({ ...BODY, startDate: '2028-02-29' });
    expect(repo.create.mock.calls[0][0].startDate.toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  test('update: tanggal selesai 2026-02-30 ditolak', async () => {
    await expect(svc.updateLoan('ln1', { endDate: '2026-02-30' })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('tanggal angsuran', () => {
  test('tanggal di masa depan (WIB) ditolak', async () => {
    await expect(svc.addRepayment('ln1', { amount: 100000, paidAt: '2099-01-01' }))
      .rejects.toMatchObject({ statusCode: 400, message: 'Tanggal bayar tidak boleh di masa depan' });
    expect(repo.addRepayment).not.toHaveBeenCalled();
  });

  test('tanggal sebelum tanggal mulai kasbon ditolak', async () => {
    await expect(svc.addRepayment('ln1', { amount: 100000, paidAt: '2026-01-09' }))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('sebelum tanggal mulai') });
  });

  test('tanggal tidak nyata ditolak', async () => {
    await expect(svc.addRepayment('ln1', { amount: 100000, paidAt: '2026-02-31' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('hari ini (WIB) dan tanggal mulai diterima', async () => {
    await svc.addRepayment('ln1', { amount: 100000, paidAt: wibDateStr() });
    await svc.addRepayment('ln1', { amount: 100000, paidAt: '2026-01-10' });
    expect(repo.addRepayment).toHaveBeenCalledTimes(2);
  });
});

describe('batas nominal (Decimal(18,2))', () => {
  test('total di atas batas ditolak validasi dengan pesan Indonesia', () => {
    const r = safeParse(createLoanSchema, { ...BODY, totalAmount: 1e16 });
    expect(r.success).toBe(false);
    expect(r.issues[0].message).toMatch(/batas maksimal/);
  });

  test('total tepat di batas lolos validasi', () => {
    expect(safeParse(createLoanSchema, { ...BODY, totalAmount: MAX_LOAN_AMOUNT }).success).toBe(true);
  });

  test('nominal angsuran bukan angka → pesan Indonesia', () => {
    const r = safeParse(addRepaymentSchema, { amount: 'abc', paidAt: '2026-01-10' });
    expect(r.success).toBe(false);
    expect(r.issues[0].message).toBe('Nominal harus berupa angka');
  });
});
