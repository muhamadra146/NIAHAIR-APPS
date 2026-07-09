'use strict';

jest.mock('./permission.repository');
jest.mock('../../config/prisma', () => ({
  employee:          { findUnique: jest.fn() },
  $transaction:      jest.fn((fn) => fn({
    staffSchedule:    { upsert: jest.fn() },
    permissionRequest: { update: jest.fn() },
  })),
}));

const repo   = require('./permission.repository');
const prisma = require('../../config/prisma');
const svc    = require('./permission.service');

const PERM_ABSENCE = {
  id: 'p1', employeeId: 'e1', branchId: 'b1',
  status: 'PENDING', type: 'ABSENCE', date: new Date('2024-06-10'),
  reason: 'Urusan keluarga',
};
const PERM_LATE = { ...PERM_ABSENCE, type: 'LATE', estimatedArrival: '09:30' };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([PERM_ABSENCE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getMy ──────────────────────────────────────────────────────────────

describe('getMy', () => {
  test('throws 400 when employeeId missing', async () => {
    await expect(svc.getMy({ employeeId: null })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('returns list filtered by employeeId', async () => {
    repo.findAll.mockResolvedValue([PERM_ABSENCE]);
    repo.count.mockResolvedValue(1);

    await svc.getMy({ employeeId: 'e1', page: 1, limit: 10 });
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employeeId: 'e1' }) })
    );
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns permission when found', async () => {
    repo.findById.mockResolvedValue(PERM_ABSENCE);
    await expect(svc.getById('p1')).resolves.toEqual(PERM_ABSENCE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  beforeEach(() => {
    repo.create.mockResolvedValue(PERM_ABSENCE);
  });

  test('throws 400 when employeeId missing', async () => {
    await expect(svc.create(null, 'b1', { date: '2024-06-10', reason: 'Test' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when LATE type missing estimatedArrival', async () => {
    await expect(svc.create('e1', 'b1', { type: 'LATE', date: '2024-06-10', reason: 'Bus' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('fetches branch from employee when branchId not provided', async () => {
    prisma.employee.findUnique.mockResolvedValue({ homeBranchId: 'b1' });
    await svc.create('e1', null, { date: '2024-06-10', reason: 'Test' });
    expect(prisma.employee.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } })
    );
  });

  test('throws 400 when no branch found from employee', async () => {
    prisma.employee.findUnique.mockResolvedValue({ homeBranchId: null });
    await expect(svc.create('e1', null, { date: '2024-06-10', reason: 'Test' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates permission with PENDING status', async () => {
    await svc.create('e1', 'b1', { date: '2024-06-10', reason: 'Test' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });
});

// ── approve ────────────────────────────────────────────────────────────

describe('approve', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.approve('x', 'mgr', null)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when status is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...PERM_ABSENCE, status: 'APPROVED' });
    await expect(svc.approve('p1', 'mgr', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('runs $transaction and returns updated permission', async () => {
    repo.findById
      .mockResolvedValueOnce(PERM_ABSENCE)
      .mockResolvedValueOnce({ ...PERM_ABSENCE, status: 'APPROVED' });

    const result = await svc.approve('p1', 'mgr1', 'OK');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.status).toBe('APPROVED');
  });
});

// ── reject ─────────────────────────────────────────────────────────────

describe('reject', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.reject('x', 'mgr', null)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when status is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...PERM_ABSENCE, status: 'REJECTED' });
    await expect(svc.reject('p1', 'mgr', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates status to REJECTED', async () => {
    repo.findById.mockResolvedValue(PERM_ABSENCE);
    repo.update.mockResolvedValue({ ...PERM_ABSENCE, status: 'REJECTED' });

    const result = await svc.reject('p1', 'mgr1', 'Tidak valid');
    expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'REJECTED' }));
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
    repo.findById.mockResolvedValue(PERM_ABSENCE);
    await expect(svc.cancel('p1', 'eOther')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 400 when permission is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...PERM_ABSENCE, status: 'APPROVED' });
    await expect(svc.cancel('p1', 'e1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cancels own PENDING permission', async () => {
    repo.findById.mockResolvedValue(PERM_ABSENCE);
    repo.update.mockResolvedValue({ ...PERM_ABSENCE, status: 'REJECTED' });

    await svc.cancel('p1', 'e1');
    expect(repo.update).toHaveBeenCalledWith('p1', { status: 'REJECTED' });
  });
});
