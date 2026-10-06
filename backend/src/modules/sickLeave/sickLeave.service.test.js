'use strict';

jest.mock('./sickLeave.repository');
jest.mock('../../config/prisma', () => {
  const p = {
    employee:      { findUnique: jest.fn() },
    staffSchedule: { upsert: jest.fn() },
    sickLeave:     { update: jest.fn() },
  };
  // Interactive transaction: run the callback with the same mocked client as tx
  p.$transaction = jest.fn((cb) => cb(p));
  return p;
});

const repo   = require('./sickLeave.repository');
const prisma = require('../../config/prisma');
const svc    = require('./sickLeave.service');

const SICK = {
  id: 'sk1', status: 'PENDING',
  employeeId: 'e1', branchId: 'b1',
  startDate: new Date('2024-06-01'), endDate: new Date('2024-06-03'),
  totalDays: 3, hasLetter: false, diagnosis: null,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([SICK]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getMy ──────────────────────────────────────────────────────────────

describe('getMy', () => {
  test('throws 400 when employeeId is missing', async () => {
    await expect(svc.getMy({ employeeId: null })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('returns list filtered by employeeId', async () => {
    repo.findAll.mockResolvedValue([SICK]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getMy({ employeeId: 'e1', page: 1, limit: 10 });
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employeeId: 'e1' }) })
    );
    expect(result.data).toHaveLength(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns sick leave when found', async () => {
    repo.findById.mockResolvedValue(SICK);
    await expect(svc.getById('sk1')).resolves.toEqual(SICK);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  const VALID_BODY = { startDate: '2024-06-01', endDate: '2024-06-03', hasLetter: false };

  test('throws 400 when employeeId is missing', async () => {
    await expect(svc.create(null, 'b1', VALID_BODY)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when endDate is before startDate', async () => {
    await expect(svc.create('e1', 'b1', { startDate: '2024-06-05', endDate: '2024-06-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when max no-letter per year is exceeded', async () => {
    repo.countNoLetterInYear.mockResolvedValue(2); // already hit MAX_NO_LETTER_PER_YEAR=2
    await expect(svc.create('e1', 'b1', VALID_BODY)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates sick leave with PENDING status', async () => {
    repo.countNoLetterInYear.mockResolvedValue(0);
    repo.create.mockResolvedValue(SICK);

    const result = await svc.create('e1', 'b1', VALID_BODY);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      status:    'PENDING',
      totalDays: 3,
    }));
    expect(result).toEqual(SICK);
  });

  test('fetches branch from employee when branchId not provided', async () => {
    repo.countNoLetterInYear.mockResolvedValue(0);
    repo.create.mockResolvedValue(SICK);
    prisma.employee.findUnique.mockResolvedValue({ homeBranchId: 'b1' });

    await svc.create('e1', null, VALID_BODY);
    expect(prisma.employee.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } })
    );
  });

  test('throws 400 when no branchId found from employee', async () => {
    prisma.employee.findUnique.mockResolvedValue({ homeBranchId: null });
    await expect(svc.create('e1', null, VALID_BODY)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('skips no-letter count check when hasLetter=true', async () => {
    repo.create.mockResolvedValue(SICK);
    await svc.create('e1', 'b1', { ...VALID_BODY, hasLetter: true });
    expect(repo.countNoLetterInYear).not.toHaveBeenCalled();
  });
});

// ── approve ────────────────────────────────────────────────────────────

describe('approve', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.approve('x', 'mgr', null)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when sick leave is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...SICK, status: 'APPROVED' });
    await expect(svc.approve('sk1', 'mgr', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('upserts staff schedules and updates status to APPROVED', async () => {
    // First findById = PENDING record; second (after transaction) = refreshed APPROVED record
    repo.findById
      .mockResolvedValueOnce(SICK)
      .mockResolvedValueOnce({ ...SICK, status: 'APPROVED' });
    prisma.staffSchedule.upsert.mockResolvedValue({});
    prisma.sickLeave.update.mockResolvedValue({});

    const result = await svc.approve('sk1', 'mgr1', 'OK');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // 2024-06-01 .. 2024-06-03 inclusive → 3 SAKIT schedules
    expect(prisma.staffSchedule.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.staffSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where:  { employeeId_branchId_workDate: { employeeId: 'e1', branchId: 'b1', workDate: new Date('2024-06-01T00:00:00.000Z') } },
      update: { status: 'SAKIT', notes: 'Sakit' },
    }));
    expect(prisma.sickLeave.update).toHaveBeenCalledWith({
      where: { id: 'sk1' },
      data:  expect.objectContaining({ status: 'APPROVED', reviewedBy: 'mgr1', reviewNote: 'OK' }),
    });
    expect(result.status).toBe('APPROVED');
  });
});

// ── reject ─────────────────────────────────────────────────────────────

describe('reject', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.reject('x', 'mgr', null)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when sick leave is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...SICK, status: 'REJECTED' });
    await expect(svc.reject('sk1', 'mgr', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates status to REJECTED', async () => {
    repo.findById.mockResolvedValue(SICK);
    repo.update.mockResolvedValue({ ...SICK, status: 'REJECTED' });

    const result = await svc.reject('sk1', 'mgr1', 'Tidak valid');
    expect(repo.update).toHaveBeenCalledWith('sk1', expect.objectContaining({ status: 'REJECTED' }));
    expect(result.status).toBe('REJECTED');
  });
});

// ── cancel ─────────────────────────────────────────────────────────────

describe('cancel', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.cancel('x', 'e1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 403 when employee is not owner', async () => {
    repo.findById.mockResolvedValue(SICK);
    await expect(svc.cancel('sk1', 'eOther')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 400 when sick leave is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...SICK, status: 'APPROVED' });
    await expect(svc.cancel('sk1', 'e1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cancels (sets REJECTED) when owner + PENDING', async () => {
    repo.findById.mockResolvedValue(SICK);
    repo.update.mockResolvedValue({ ...SICK, status: 'REJECTED' });

    await svc.cancel('sk1', 'e1');
    expect(repo.update).toHaveBeenCalledWith('sk1', { status: 'REJECTED' });
  });
});
