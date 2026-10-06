'use strict';

jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
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
const { createSyncJob } = require('../syncQueue/syncQueue.service');

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
  const commissionLink = jest.fn();
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
      unusedLeavePayouts:       [],
      approvedLatePermissions:  [],
      holidays:                 [],
    });
    repo.findPreviousPayroll.mockResolvedValue(null);
    // Jadwal lengkap untuk periode yang diminta (tanpa peringatan jadwal belum lengkap)
    repo.findScheduleDates.mockImplementation(async (_e, start, end) => {
      const out = [];
      for (let t = new Date(start).getTime(); t <= new Date(end).getTime(); t += 86400000) out.push({ workDate: new Date(t) });
      return out;
    });
    repo.findEmployeePayDay.mockResolvedValue(1);
    prisma.payroll.create.mockResolvedValue({ ...PAYROLL_DRAFT, items: [] });
    commissionLink.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation((fn) => fn({
      payroll:    { create: prisma.payroll.create },
      commission: { updateMany: commissionLink },
    }));
  });

  test('throws 400 when neither yearMonth nor periodStart+periodEnd provided', async () => {
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('jadwal belum lengkap → peringatan', async () => {
    repo.findScheduleDates.mockResolvedValue([]);
    const result = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    expect(result.warnings.some((w) => /Jadwal belum lengkap: 30 hari/.test(w))).toBe(true);
  });

  test('throws 409 when overlapping payroll exists', async () => {
    repo.findOverlapping.mockResolvedValue(PAYROLL_DRAFT);
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 400 when no active salary setting', async () => {
    repo.getGenerationData.mockResolvedValue({
      salarySetting: null, schedules: [], attendances: [], commissions: [],
      activeLoans: [], unusedLeavePayouts: [],
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
    expect(result.warnings).toEqual([]);
  });

  // Nama gaji = bulan kerja; periode dari tanggal gajian karyawan (COM-017)
  test('mode bulan memakai tanggal gajian karyawan (payDay 7 → 7 Jun – 6 Jul)', async () => {
    repo.findEmployeePayDay.mockResolvedValue(7);
    await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    const data = prisma.payroll.create.mock.calls[0][0].data;
    expect(data.periodStart.toISOString().slice(0, 10)).toBe('2024-06-07');
    expect(data.periodEnd.toISOString().slice(0, 10)).toBe('2024-07-06');
  });

  test('komisi di slip dicatat ke payroll ini (payrollId) dalam transaksi yang sama', async () => {
    repo.getGenerationData.mockResolvedValue({
      salarySetting: SALARY_SETTING, schedules: [], attendances: [],
      commissions: [{ id: 'c1', commissionAmount: 50000 }, { id: 'c2', commissionAmount: 5000 }],
      activeLoans: [], unusedLeavePayouts: [], approvedLatePermissions: [], holidays: [],
    });
    await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    expect(commissionLink).toHaveBeenCalledWith({
      where: { id: { in: ['c1', 'c2'] }, payrollId: null },
      data:  { payrollId: PAYROLL_DRAFT.id },
    });
  });

  test('celah dari payroll sebelumnya → peringatan (tanggal gajian diubah)', async () => {
    repo.findPreviousPayroll.mockResolvedValue({
      id: 'old', periodStart: new Date('2024-04-01'), periodEnd: new Date('2024-04-30'),
    });
    const result = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/celah/);
  });

  test('tumpang tindih → 409 dengan saran Rentang Tanggal', async () => {
    repo.findOverlapping.mockResolvedValue(PAYROLL_DRAFT);
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/Rentang Tanggal/) });
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
    const commissionUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation((fn) =>
      fn({
        payroll:       { update: jest.fn() },
        commission:    { updateMany: commissionUpdateMany },
        loan:          { findMany: jest.fn().mockResolvedValue([]) },
        loanRepayment: { create: jest.fn() },
      })
    );

    const result = await svc.markAsPaid('pr1', 'u1');
    expect(prisma.$transaction).toHaveBeenCalled();
    // tepat komisi yang tercatat di slip ini ditandai PAID (bukan tebakan tanggal)
    expect(commissionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { payrollId: 'pr1', status: 'APPROVED' },
    }));
    // payroll PAID → antre sync Jurnal Umum ke Accurate
    expect(createSyncJob).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'PAYROLL', entityId: 'pr1' }));
    expect(result.status).toBe('PAID');
  });
});
