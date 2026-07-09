'use strict';

jest.mock('./leave.repository');
jest.mock('../leaveQuota/leaveQuota.service');
jest.mock('../../config/prisma', () => ({
  leaveType: { findUnique: jest.fn() },
  $transaction: jest.fn((fn) => fn({
    staffSchedule: { upsert: jest.fn() },
    leave:         { update: jest.fn() },
  })),
}));

const repo     = require('./leave.repository');
const quotaSvc = require('../leaveQuota/leaveQuota.service');
const prisma   = require('../../config/prisma');
const svc      = require('./leave.service');

const LEAVE = {
  id:         'lv1',
  employeeId: 'e1',
  status:     'PENDING',
  startDate:  new Date('2024-06-01'),
  endDate:    new Date('2024-06-03'),
  totalDays:  3,
  leaveTypeId: null,
  leaveType:   null,
  employee:    { homeBranch: { id: 'b1' } },
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([LEAVE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns leave when found', async () => {
    repo.findById.mockResolvedValue(LEAVE);
    await expect(svc.getById('lv1')).resolves.toEqual(LEAVE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createLeave ────────────────────────────────────────────────────────

describe('createLeave', () => {
  beforeEach(() => {
    prisma.leaveType.findUnique.mockResolvedValue(null);
    repo.create.mockResolvedValue(LEAVE);
  });

  test('throws 400 when employeeId is missing', async () => {
    await expect(svc.createLeave(null, { startDate: '2024-06-01', endDate: '2024-06-03' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when endDate is before startDate', async () => {
    await expect(svc.createLeave('e1', { startDate: '2024-06-05', endDate: '2024-06-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 404 when leaveTypeId does not exist', async () => {
    prisma.leaveType.findUnique.mockResolvedValue(null);
    await expect(svc.createLeave('e1', {
      startDate: '2024-06-01', endDate: '2024-06-03', leaveTypeId: 'lt99',
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when ANNUAL quota is insufficient', async () => {
    prisma.leaveType.findUnique.mockResolvedValue({ quotaType: 'ANNUAL' });
    quotaSvc.getBalance.mockResolvedValue({ totalDays: 5, usedDays: 4 }); // remaining=1, need 3
    await expect(svc.createLeave('e1', {
      startDate: '2024-06-01', endDate: '2024-06-03', leaveTypeId: 'lt1',
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates leave with PENDING status', async () => {
    await svc.createLeave('e1', { startDate: '2024-06-01', endDate: '2024-06-03' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });

  test('calculates totalDays correctly', async () => {
    await svc.createLeave('e1', { startDate: '2024-06-01', endDate: '2024-06-03' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ totalDays: 3 }));
  });

  test('skips quota check for non-ANNUAL type', async () => {
    prisma.leaveType.findUnique.mockResolvedValue({ quotaType: 'EVENT_BASED' });
    await svc.createLeave('e1', { startDate: '2024-06-01', endDate: '2024-06-02', leaveTypeId: 'lt1' });
    expect(quotaSvc.getBalance).not.toHaveBeenCalled();
  });
});

// ── approve ────────────────────────────────────────────────────────────

describe('approve', () => {
  test('throws 404 when leave not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.approve('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when leave is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...LEAVE, status: 'APPROVED' });
    await expect(svc.approve('lv1', 'u1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('calls $transaction and returns updated leave on success', async () => {
    repo.findById
      .mockResolvedValueOnce(LEAVE)         // first call: existence check
      .mockResolvedValueOnce({ ...LEAVE, status: 'APPROVED' }); // second call: after update
    quotaSvc.incrementUsed.mockResolvedValue(undefined);

    const result = await svc.approve('lv1', 'u1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.status).toBe('APPROVED');
  });
});

// ── reject ─────────────────────────────────────────────────────────────

describe('reject', () => {
  test('throws 404 when leave not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.reject('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when leave is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...LEAVE, status: 'REJECTED' });
    await expect(svc.reject('lv1', 'u1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates status to REJECTED on success', async () => {
    repo.findById.mockResolvedValue(LEAVE);
    repo.update.mockResolvedValue({ ...LEAVE, status: 'REJECTED' });

    const result = await svc.reject('lv1', 'u1');
    expect(repo.update).toHaveBeenCalledWith('lv1', expect.objectContaining({ status: 'REJECTED' }));
    expect(result.status).toBe('REJECTED');
  });
});

// ── cancel ─────────────────────────────────────────────────────────────

describe('cancel', () => {
  test('throws 404 when leave not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.cancel('x', 'e1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 403 when employee is not owner', async () => {
    repo.findById.mockResolvedValue(LEAVE);
    await expect(svc.cancel('lv1', 'otherEmployee')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 400 when leave is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...LEAVE, status: 'APPROVED' });
    await expect(svc.cancel('lv1', 'e1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cancels leave when owner + PENDING', async () => {
    repo.findById.mockResolvedValue(LEAVE);
    repo.update.mockResolvedValue({ ...LEAVE, status: 'CANCELLED' });

    await svc.cancel('lv1', 'e1');
    expect(repo.update).toHaveBeenCalledWith('lv1', { status: 'CANCELLED' });
  });
});
