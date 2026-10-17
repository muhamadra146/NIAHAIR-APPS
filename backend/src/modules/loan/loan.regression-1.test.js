'use strict';

// Regression G2-16 — found by API QA 2026-10-15
jest.mock('./loan.repository');
jest.mock('../notification/notification.service', () => ({ loanCreated: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn((fn) => fn('tx')) }));

const repo = require('./loan.repository');
const svc  = require('./loan.service');

const BODY = {
  employeeId: 'e1', branchId: 'b1', totalAmount: 1000000, monthlyDeduction: 250000, startDate: '2026-10-01',
};
const LOAN = { id: 'ln1', status: 'ACTIVE', totalAmount: '1000000', startDate: new Date('2026-10-01') };

beforeEach(() => {
  jest.clearAllMocks();
  repo.generateLoanNo.mockResolvedValue('KB-1');
  repo.create.mockImplementation(async (d) => ({ id: 'ln1', ...d }));
  repo.findById.mockResolvedValue(LOAN);
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
});

test('create: potongan per bulan > total → 400', async () => {
  await expect(svc.createLoan({ ...BODY, monthlyDeduction: 2000000 })).rejects.toMatchObject({ statusCode: 400 });
  expect(repo.create).not.toHaveBeenCalled();
});

test('create: tanggal selesai < tanggal mulai → 400', async () => {
  await expect(svc.createLoan({ ...BODY, endDate: '2026-09-01' })).rejects.toMatchObject({ statusCode: 400 });
});

test('create: valid → dibuat', async () => {
  await svc.createLoan({ ...BODY, monthlyDeduction: 1000000, endDate: '2026-12-01' });
  expect(repo.create).toHaveBeenCalled();
});

test('update: potongan per bulan > total tersimpan → 400', async () => {
  await expect(svc.updateLoan('ln1', { monthlyDeduction: 1500000 })).rejects.toMatchObject({ statusCode: 400 });
  expect(repo.update).not.toHaveBeenCalled();
});

test('update: tanggal selesai sebelum tanggal mulai tersimpan → 400', async () => {
  await expect(svc.updateLoan('ln1', { endDate: '2026-09-30' })).rejects.toMatchObject({ statusCode: 400 });
});
