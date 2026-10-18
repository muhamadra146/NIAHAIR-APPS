'use strict';

// QA 2026-10-18 — potongan kasbon hanya untuk kasbon yang mulai paling lambat akhir periode
// (kasbon bertanggal mulai sesudah periode ikut payroll berikutnya), saat generate dan saat dibayar.
jest.mock('../../config/prisma', () => {
  const tx = {
    payroll:       { update: jest.fn() },
    commission:    { updateMany: jest.fn() },
    loan:          { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    loanRepayment: { findFirst: jest.fn(), create: jest.fn() },
  };
  return {
    __tx: tx,
    employeeSalarySettings: { findFirst: jest.fn().mockResolvedValue(null) },
    staffSchedule:          { findMany: jest.fn().mockResolvedValue([]) },
    attendance:             { findMany: jest.fn().mockResolvedValue([]) },
    commission:             { findMany: jest.fn().mockResolvedValue([]) },
    loan:                   { findMany: jest.fn().mockResolvedValue([]) },
    permissionRequest:      { findMany: jest.fn().mockResolvedValue([]) },
    holiday:                { findMany: jest.fn().mockResolvedValue([]) },
    employeeOmsetBonusTier: { findMany: jest.fn().mockResolvedValue([]) },
    invoice:                { aggregate: jest.fn().mockResolvedValue({ _sum: { grandTotal: 0 } }) },
    employee:               { findUnique: jest.fn().mockResolvedValue({ hireDate: null, resignDate: null }) },
    $transaction:           jest.fn((fn) => fn(tx)),
  };
});
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));

const prisma = require('../../config/prisma');
const repo   = require('./payroll.repository');

beforeEach(() => jest.clearAllMocks());

test('getGenerationData: kasbon aktif dengan startDate <= akhir periode (hari WIB)', async () => {
  await repo.getGenerationData('e1', 'b1', new Date('2026-10-01'), new Date('2026-10-31'));
  expect(prisma.loan.findMany).toHaveBeenCalledWith({
    where: { employeeId: 'e1', status: 'ACTIVE', startDate: { lte: new Date('2026-10-31T16:59:59.999Z') } },
  });
});

test('markAsPaid: cicilan kasbon memakai filter startDate yang sama', async () => {
  jest.spyOn(repo, 'findById').mockResolvedValue({
    id: 'pr1', status: 'APPROVED', employeeId: 'e1',
    periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-31'),
    createdAt: new Date('2026-11-01T02:00:00Z'), lastRecalculatedAt: null,
    items: [{ type: 'DEDUCTION', category: 'kasbon', amount: '100000' }],
  });
  const svc = require('./payroll.service');
  await svc.markAsPaid('pr1', 'u1');
  const { where } = prisma.__tx.loan.findMany.mock.calls[0][0];
  expect(where.startDate).toEqual({ lte: new Date('2026-10-31T16:59:59.999Z') });
});
