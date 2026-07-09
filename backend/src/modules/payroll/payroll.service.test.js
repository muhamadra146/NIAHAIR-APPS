'use strict';

jest.mock('./payroll.repository');
jest.mock('../../config/prisma', () => ({
  payroll: { create: jest.fn() },
  $transaction: jest.fn((fn) => fn({
    payroll:         { update: jest.fn() },
    loan:            { findMany: jest.fn().mockResolvedValue([]) },
    loanRepayment:   { create: jest.fn() },
  })),
}));

const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');

const PAYROLL_DRAFT = {
  id: 'pr1', status: 'DRAFT',
  employeeId: 'e1', branchId: 'b1',
  periodStart: new Date('2024-06-01'), periodEnd: new Date('2024-06-30'),
  grossIncome: 5000000, totalDeductions: 500000, netSalary: 4500000,
  items: [],
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([PAYROLL_DRAFT]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns payroll when found', async () => {
    repo.findById.mockResolvedValue(PAYROLL_DRAFT);
    await expect(svc.getById('pr1')).resolves.toEqual(PAYROLL_DRAFT);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── generate ───────────────────────────────────────────────────────────

describe('generate', () => {
  const SALARY_SETTING = {
    baseSalary: 5000000,
    mealAllowance: 0, transportAllowance: 0, overtimeRate: 0,
    bpjsJhtPercent: 2, bpjsKesPercent: 1, bpjsTkPercent: 0.54,
    isPpn: false, ppnRate: 0,
  };

  beforeEach(() => {
    repo.findOverlapping.mockResolvedValue(null);
    repo.getGenerationData.mockResolvedValue({
      salarySetting:            SALARY_SETTING,
      schedules:                [],
      attendances:              [],
      commissions:              [],
      activeLoans:              [],
      hsAppointments:           [],
      unusedLeavePayouts:       [],
      approvedLatePermissions:  [],
      holidays:                 [],
    });
    prisma.payroll.create.mockResolvedValue({ ...PAYROLL_DRAFT, items: [] });
  });

  test('throws 400 when neither yearMonth nor periodStart+periodEnd provided', async () => {
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 409 when overlapping payroll exists', async () => {
    repo.findOverlapping.mockResolvedValue(PAYROLL_DRAFT);
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 400 when no active salary setting', async () => {
    repo.getGenerationData.mockResolvedValue({
      salarySetting: null, schedules: [], attendances: [], commissions: [],
      activeLoans: [], hsAppointments: [], unusedLeavePayouts: [],
      approvedLatePermissions: [], holidays: [],
    });
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates payroll with DRAFT status when yearMonth provided', async () => {
    const result = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    expect(prisma.payroll.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) })
    );
    expect(result).toBeDefined();
  });
});

// ── submitForApproval ──────────────────────────────────────────────────

describe('submitForApproval', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.submitForApproval('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when status is not DRAFT', async () => {
    repo.findById.mockResolvedValue({ ...PAYROLL_DRAFT, status: 'APPROVED' });
    await expect(svc.submitForApproval('pr1', 'u1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates status to PENDING_APPROVAL on success', async () => {
    repo.findById.mockResolvedValue(PAYROLL_DRAFT);
    repo.update.mockResolvedValue({ ...PAYROLL_DRAFT, status: 'PENDING_APPROVAL' });

    const result = await svc.submitForApproval('pr1', 'u1');
    expect(repo.update).toHaveBeenCalledWith('pr1', expect.objectContaining({ status: 'PENDING_APPROVAL' }));
    expect(result.status).toBe('PENDING_APPROVAL');
  });
});

// ── approve ────────────────────────────────────────────────────────────

describe('approve', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.approve('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when status is not PENDING_APPROVAL', async () => {
    repo.findById.mockResolvedValue(PAYROLL_DRAFT);
    await expect(svc.approve('pr1', 'u1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates status to APPROVED', async () => {
    repo.findById.mockResolvedValue({ ...PAYROLL_DRAFT, status: 'PENDING_APPROVAL' });
    repo.update.mockResolvedValue({ ...PAYROLL_DRAFT, status: 'APPROVED' });

    const result = await svc.approve('pr1', 'u1');
    expect(result.status).toBe('APPROVED');
  });
});

// ── markAsPaid ─────────────────────────────────────────────────────────

describe('markAsPaid', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.markAsPaid('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when status is not APPROVED', async () => {
    repo.findById.mockResolvedValue(PAYROLL_DRAFT);
    await expect(svc.markAsPaid('pr1', 'u1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('runs $transaction and returns updated payroll when APPROVED', async () => {
    const approved = { ...PAYROLL_DRAFT, status: 'APPROVED', items: [] };
    repo.findById
      .mockResolvedValueOnce(approved)                              // first: status check
      .mockResolvedValueOnce({ ...approved, status: 'PAID' });     // second: return result
    prisma.$transaction.mockImplementation((fn) =>
      fn({ payroll: { update: jest.fn() }, loan: { findMany: jest.fn().mockResolvedValue([]) }, loanRepayment: { create: jest.fn() } })
    );

    const result = await svc.markAsPaid('pr1', 'u1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.status).toBe('PAID');
  });
});
