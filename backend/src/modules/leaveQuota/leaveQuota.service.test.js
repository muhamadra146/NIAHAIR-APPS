'use strict';

jest.mock('./leaveQuota.repository');
jest.mock('../leaveType/leaveType.repository');

const repo          = require('./leaveQuota.repository');
const leaveTypeRepo = require('../leaveType/leaveType.repository');
const svc           = require('./leaveQuota.service');

const QUOTA = { employeeId: 'e1', leaveTypeId: 'lt1', year: 2024, totalDays: 12, usedDays: 3 };

beforeEach(() => jest.clearAllMocks());

// ── getQuotas ──────────────────────────────────────────────────────────

describe('getQuotas', () => {
  test('returns quotas with optional filters', async () => {
    repo.findMany.mockResolvedValue([QUOTA]);
    const result = await svc.getQuotas({ employeeId: 'e1', year: 2024 });
    expect(repo.findMany).toHaveBeenCalledWith({ employeeId: 'e1', year: 2024 });
    expect(result).toHaveLength(1);
  });

  test('returns all quotas without filters', async () => {
    repo.findMany.mockResolvedValue([QUOTA]);
    await svc.getQuotas();
    expect(repo.findMany).toHaveBeenCalledWith({});
  });
});

// ── getMyQuotas ────────────────────────────────────────────────────────

describe('getMyQuotas', () => {
  test('filters by employeeId', async () => {
    repo.findMany.mockResolvedValue([QUOTA]);
    await svc.getMyQuotas('e1', 2024);
    expect(repo.findMany).toHaveBeenCalledWith({ employeeId: 'e1', year: 2024 });
  });
});

// ── assign ─────────────────────────────────────────────────────────────

describe('assign', () => {
  test('throws 400 when required fields are missing', async () => {
    await expect(svc.assign({ employeeId: 'e1', leaveTypeId: 'lt1', year: 2024 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 404 when leave type not found', async () => {
    leaveTypeRepo.findById.mockResolvedValue(null);
    await expect(svc.assign({ employeeId: 'e1', leaveTypeId: 'bad', year: 2024, totalDays: 12 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('upserts quota when all fields valid', async () => {
    leaveTypeRepo.findById.mockResolvedValue({ id: 'lt1', code: 'SAKIT' });
    repo.upsert.mockResolvedValue(QUOTA);

    const result = await svc.assign({ employeeId: 'e1', leaveTypeId: 'lt1', year: 2024, totalDays: 12 });
    expect(repo.upsert).toHaveBeenCalledWith('e1', 'lt1', 2024, 12);
    expect(result).toEqual(QUOTA);
  });
});

// ── getBalance ─────────────────────────────────────────────────────────

describe('getBalance', () => {
  test('returns null when no quota found', async () => {
    repo.findOne.mockResolvedValue(null);
    const result = await svc.getBalance('e1', 'lt1', 2024);
    expect(result).toBeNull();
  });

  test('computes remainingDays from totalDays - usedDays', async () => {
    repo.findOne.mockResolvedValue(QUOTA);
    const result = await svc.getBalance('e1', 'lt1', 2024);
    expect(result.remainingDays).toBe(9); // 12 - 3
  });
});

// ── incrementUsed / decrementUsed ──────────────────────────────────────

describe('incrementUsed', () => {
  test('calls repo with correct params', async () => {
    repo.incrementUsed.mockResolvedValue(undefined);
    await svc.incrementUsed('e1', 'lt1', 2024, 3);
    expect(repo.incrementUsed).toHaveBeenCalledWith('e1', 'lt1', 2024, 3);
  });
});

describe('decrementUsed', () => {
  test('calls repo with correct params', async () => {
    repo.decrementUsed.mockResolvedValue(undefined);
    await svc.decrementUsed('e1', 'lt1', 2024, 2);
    expect(repo.decrementUsed).toHaveBeenCalledWith('e1', 'lt1', 2024, 2);
  });
});
