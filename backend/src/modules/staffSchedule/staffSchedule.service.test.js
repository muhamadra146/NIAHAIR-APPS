'use strict';

jest.mock('./staffSchedule.repository');
jest.mock('../../config/prisma', () => ({
  shift:            { findMany: jest.fn() },
  staffSchedule:    { findMany: jest.fn() },
  attendance:       { findMany: jest.fn() },
  appointmentStaff: { findMany: jest.fn() },
  $transaction:     jest.fn((fn) => fn()),
}));

const repo   = require('./staffSchedule.repository');
const prisma = require('../../config/prisma');
const svc    = require('./staffSchedule.service');

const EMPLOYEE_BRANCH = {
  employee: {
    id: 'e1', name: 'Nia', employeeCode: 'EMP-001',
    role: { id: 'r1', code: 'STYLIST', name: 'Stylist' },
  },
};
const SCHEDULE = {
  id: 'ss1', employeeId: 'e1', branchId: 'b1',
  workDate: new Date('2024-06-03'), status: 'WORKING',
  shift: { id: 'sh1', code: 'PAGI', name: 'Pagi', startTime: '08:00', endTime: '17:00' },
};

beforeEach(() => jest.clearAllMocks());

// ── getRoster ──────────────────────────────────────────────────────────

describe('getRoster', () => {
  test('throws 400 when startDate is missing', async () => {
    await expect(svc.getRoster({ branchId: 'b1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when branchId is missing', async () => {
    await expect(svc.getRoster({ startDate: '2024-06-03' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('returns roster grouped by employee', async () => {
    repo.findRoster.mockResolvedValue({
      employeeBranches: [EMPLOYEE_BRANCH],
      schedules:        [SCHEDULE],
    });

    const result = await svc.getRoster({ startDate: '2024-06-03', branchId: 'b1', days: 1 });
    expect(result.dates).toHaveLength(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].employee.name).toBe('Nia');
  });

  test('marks schedule slots as null when no schedule for that day', async () => {
    repo.findRoster.mockResolvedValue({
      employeeBranches: [EMPLOYEE_BRANCH],
      schedules:        [], // no schedules
    });

    const result = await svc.getRoster({ startDate: '2024-06-03', branchId: 'b1', days: 2 });
    expect(result.rows[0].schedules[0].scheduleId).toBeNull();
  });
});

// ── bulkUpsert ─────────────────────────────────────────────────────────

describe('bulkUpsert', () => {
  test('throws 400 when branchId is missing', async () => {
    await expect(svc.bulkUpsert({ schedules: [{ employeeId: 'e1', date: '2024-06-03', shiftId: 'sh1' }] }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('returns {updated: 0} when schedules array is empty', async () => {
    const result = await svc.bulkUpsert({ branchId: 'b1', schedules: [] });
    expect(result).toEqual({ updated: 0 });
  });

  test('throws 400 when shiftId does not exist', async () => {
    prisma.shift.findMany.mockResolvedValue([]); // no shifts found
    await expect(svc.bulkUpsert({ branchId: 'b1', schedules: [{ employeeId: 'e1', date: '2024-06-03', shiftId: 'bad' }] }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('upserts schedules when shiftIds are valid', async () => {
    prisma.shift.findMany.mockResolvedValue([{ id: 'sh1' }]);
    repo.upsertSchedule.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (fn) => fn());

    const result = await svc.bulkUpsert({
      branchId: 'b1',
      schedules: [{ employeeId: 'e1', date: '2024-06-03', shiftId: 'sh1', status: 'WORKING' }],
    });
    expect(repo.upsertSchedule).toHaveBeenCalled();
    expect(result.updated).toBe(1);
  });

  test('deletes schedule when status=null and shiftId=null', async () => {
    repo.deleteSchedule.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (fn) => fn());

    const result = await svc.bulkUpsert({
      branchId: 'b1',
      schedules: [{ employeeId: 'e1', date: '2024-06-03', shiftId: null, status: null }],
    });
    expect(repo.deleteSchedule).toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });
});

// ── getMySchedules ─────────────────────────────────────────────────────

describe('getMySchedules', () => {
  test('throws 400 when employeeId is missing', async () => {
    await expect(svc.getMySchedules(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('returns schedules for employee', async () => {
    prisma.staffSchedule.findMany.mockResolvedValue([SCHEDULE]);
    const result = await svc.getMySchedules('e1', { startDate: '2024-06-01', endDate: '2024-06-30' });
    expect(result).toHaveLength(1);
  });
});
