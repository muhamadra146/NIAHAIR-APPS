'use strict';

/**
 * Unit tests — attendance.service.js
 * Business Rules: computeStatus (via checkOut), getReport date guards,
 *                 checkOut state guards, getById 404
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: attendance.repository + setting.repository + prisma.
 */

jest.mock('./attendance.repository', () => ({
  findById:        jest.fn(),
  findBySchedule:  jest.fn(),
  findMany:        jest.fn(),
  count:           jest.fn(),
  upsertBySchedule: jest.fn(),
  update:          jest.fn(),
  getReportData:   jest.fn(),
}));

jest.mock('../setting/setting.repository', () => ({
  findByKey: jest.fn(),
}));

jest.mock('../../config/prisma', () => ({
  staffSchedule: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  branch:        { findUnique: jest.fn() },
  employee:      { findUnique: jest.fn() },
}));

const repo   = require('./attendance.repository');
const prisma = require('../../config/prisma');
const { getById, checkOut, getReport } = require('./attendance.service');
const AppError = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

// ── getById ───────────────────────────────────────────────────────────────────

describe('getById', () => {
  test('should_return_attendance_record_when_found', async () => {
    const mockRecord = { id: 'att1', status: 'PRESENT', employeeId: 'e1' };
    repo.findById.mockResolvedValue(mockRecord);

    const result = await getById('att1');

    expect(result).toEqual(mockRecord);
    expect(repo.findById).toHaveBeenCalledWith('att1');
  });

  test('should_throw_404_when_record_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(getById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── checkOut ──────────────────────────────────────────────────────────────────

describe('checkOut', () => {
  const baseRecord = {
    id:           'att1',
    checkInAt:    new Date('2025-01-15T03:00:00Z'), // 10:00 WIB
    checkOutAt:   null,
    staffSchedule: {
      shift: { startTime: '09:00', endTime: '17:00' },
    },
  };

  test('should_throw_400_when_no_check_in_found_for_schedule', async () => {
    repo.findBySchedule.mockResolvedValue(null);

    await expect(checkOut({ staffScheduleId: 'sched1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_throw_400_when_check_in_is_missing_from_record', async () => {
    repo.findBySchedule.mockResolvedValue({ ...baseRecord, checkInAt: null });

    await expect(checkOut({ staffScheduleId: 'sched1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_throw_409_when_already_checked_out', async () => {
    repo.findBySchedule.mockResolvedValue({
      ...baseRecord,
      checkOutAt: new Date('2025-01-15T10:00:00Z'),
    });

    await expect(checkOut({ staffScheduleId: 'sched1' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('should_call_repo_update_when_valid_check_out', async () => {
    repo.findBySchedule.mockResolvedValue(baseRecord);
    repo.update.mockResolvedValue({ ...baseRecord, checkOutAt: new Date() });

    await checkOut({ staffScheduleId: 'sched1' });

    expect(repo.update).toHaveBeenCalledWith(
      'att1',
      expect.objectContaining({ checkOutAt: expect.any(Date) })
    );
  });
});

// ── getReport ─────────────────────────────────────────────────────────────────

describe('getReport', () => {
  test('should_throw_400_when_branchId_is_missing', async () => {
    await expect(
      getReport({ startDate: '2025-01-01', endDate: '2025-01-31' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_throw_400_when_startDate_is_missing', async () => {
    await expect(
      getReport({ branchId: 'br1', endDate: '2025-01-31' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_throw_400_when_endDate_is_missing', async () => {
    await expect(
      getReport({ branchId: 'br1', startDate: '2025-01-01' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_throw_400_when_endDate_is_before_startDate', async () => {
    await expect(
      getReport({ branchId: 'br1', startDate: '2025-01-31', endDate: '2025-01-01' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_return_aggregated_report_with_attendance_rate', async () => {
    const schedules = [
      {
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'PRESENT', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 30, isHolidayWork: false },
      },
      {
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: null, // ABSENT
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(1);
    const row = result.data[0];
    expect(row.scheduledDays).toBe(2);
    expect(row.presentDays).toBe(1);
    expect(row.absentDays).toBe(1);
    expect(row.attendanceRate).toBe(50);
  });

  test('should_accumulate_late_early_overtime_minutes_correctly', async () => {
    const schedules = [
      {
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'LATE', lateMinutes: 20, earlyLeaveMinutes: 0, overtimeMinutes: 0, isHolidayWork: false },
      },
      {
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'EARLY_LEAVE', lateMinutes: 0, earlyLeaveMinutes: 45, overtimeMinutes: 0, isHolidayWork: false },
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    const row = result.data[0];
    expect(row.lateMinutes).toBe(20);
    expect(row.earlyLeaveMinutes).toBe(45);
    expect(row.lateDays).toBe(1);
    expect(row.earlyLeaveDays).toBe(1);
  });

  test('should_count_holiday_work_days', async () => {
    const schedules = [
      {
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'PRESENT', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, isHolidayWork: true },
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data[0].holidayWorkDays).toBe(1);
  });

  // ── Status-based branching regression tests (Bug 1+2 fix) ─────────────────

  test('should_count_leave_schedule_as_leaveDays_not_scheduledDays', async () => {
    const schedules = [
      {
        status:     'LEAVE',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: null,
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    // Employee entirely on LEAVE → filtered out (scheduledDays=0, holidayWorkDays=0)
    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(0);
  });

  test('should_count_izin_schedule_as_izinDays_not_scheduledDays', async () => {
    const schedules = [
      {
        status:     'IZIN',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: null,
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(0);
  });

  test('should_count_sakit_schedule_as_sakitDays_not_scheduledDays', async () => {
    const schedules = [
      {
        status:     'SAKIT',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: null,
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(0);
  });

  test('should_include_employee_with_leave_and_working_days', async () => {
    const schedules = [
      {
        status:     'LEAVE',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: null,
      },
      {
        status:     'WORKING',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'PRESENT', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, isHolidayWork: false },
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(1);
    const row = result.data[0];
    expect(row.leaveDays).toBe(1);
    expect(row.scheduledDays).toBe(1);
    expect(row.presentDays).toBe(1);
    expect(row.absentDays).toBe(0);
    expect(row.attendanceRate).toBe(100);
  });

  test('should_not_count_off_schedule_as_scheduledDays_when_no_attendance', async () => {
    const schedules = [
      {
        status:     'OFF',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: null,
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    // Employee only has OFF schedule, no holiday work → filtered out
    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(0);
  });

  test('should_count_off_schedule_with_holiday_work_as_holidayWorkDays', async () => {
    const schedules = [
      {
        status:     'OFF',
        employeeId: 'e1',
        employee:   { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'PRESENT', lateMinutes: 0, earlyLeaveMinutes: 10, overtimeMinutes: 60, isHolidayWork: true },
      },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    // Employee appears (holidayWorkDays > 0)
    expect(result.data).toHaveLength(1);
    const row = result.data[0];
    expect(row.scheduledDays).toBe(0);    // OFF day not a scheduled working day
    expect(row.holidayWorkDays).toBe(1);
    expect(row.earlyLeaveMinutes).toBe(10);
    expect(row.overtimeMinutes).toBe(60);
    expect(row.absentDays).toBe(0);       // OFF is not an absent day
    expect(row.attendanceRate).toBe(0);   // 0 scheduledDays → rate = 0 (but they appear due to holiday work)
  });

  test('should_correctly_separate_leave_izin_sakit_breakdown', async () => {
    const schedules = [
      { status: 'LEAVE',   employeeId: 'e1', employee: { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' }, attendance: null },
      { status: 'LEAVE',   employeeId: 'e1', employee: { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' }, attendance: null },
      { status: 'IZIN',    employeeId: 'e1', employee: { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' }, attendance: null },
      { status: 'SAKIT',   employeeId: 'e1', employee: { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' }, attendance: null },
      { status: 'WORKING', employeeId: 'e1', employee: { id: 'e1', name: 'Nia', employeeCode: 'EMP-001' },
        attendance: { status: 'PRESENT', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, isHolidayWork: false } },
    ];
    repo.getReportData.mockResolvedValue(schedules);

    const result = await getReport({ branchId: 'br1', startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(result.data).toHaveLength(1);
    const row = result.data[0];
    expect(row.leaveDays).toBe(2);
    expect(row.izinDays).toBe(1);
    expect(row.sakitDays).toBe(1);
    expect(row.scheduledDays).toBe(1);  // only WORKING counted
    expect(row.absentDays).toBe(0);     // LEAVE/IZIN/SAKIT not absent
    expect(row.presentDays).toBe(1);
    expect(row.attendanceRate).toBe(100);
  });
});
