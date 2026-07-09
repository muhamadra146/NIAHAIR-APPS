'use strict';

/**
 * Unit tests — salary.service.js
 * Business Rules: single active salary guard (deactivatePrevious on activation),
 *                 404 guards for active/by-id lookups
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: salary.repository only. AppError is real.
 */

jest.mock('./salary.repository', () => ({
  findByEmployee:      jest.fn(),
  findActiveByEmployee: jest.fn(),
  findById:            jest.fn(),
  create:              jest.fn(),
  deactivatePrevious:  jest.fn(),
  update:              jest.fn(),
}));

const repo     = require('./salary.repository');
const { getActive, getById, createSetting, updateSetting } = require('./salary.service');
const AppError = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

const makeSetting = (overrides = {}) => ({
  id:          's1',
  employeeId:  'e1',
  baseSalary:  5000000,
  isActive:    true,
  effectiveDate: new Date('2025-01-01'),
  ...overrides,
});

// ── getActive ─────────────────────────────────────────────────────────────────

describe('getActive', () => {
  test('should_return_active_setting_when_found', async () => {
    const setting = makeSetting();
    repo.findActiveByEmployee.mockResolvedValue(setting);

    const result = await getActive('e1');

    expect(result).toEqual(setting);
    expect(repo.findActiveByEmployee).toHaveBeenCalledWith('e1');
  });

  test('should_throw_404_when_no_active_setting', async () => {
    repo.findActiveByEmployee.mockResolvedValue(null);

    await expect(getActive('e1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('getById', () => {
  test('should_return_setting_when_found', async () => {
    const setting = makeSetting();
    repo.findById.mockResolvedValue(setting);

    const result = await getById('s1');

    expect(result).toEqual(setting);
  });

  test('should_throw_404_when_setting_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(getById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createSetting ─────────────────────────────────────────────────────────────

describe('createSetting', () => {
  const validBody = {
    employeeId:    'e1',
    baseSalary:    5000000,
    effectiveDate: '2025-01-01',
    isActive:      true,
  };

  test('should_create_setting_when_data_valid', async () => {
    repo.create.mockResolvedValue(makeSetting());
    repo.deactivatePrevious.mockResolvedValue({});

    const result = await createSetting(validBody);

    expect(result.id).toBe('s1');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('should_deactivate_previous_when_new_setting_is_active', async () => {
    repo.create.mockResolvedValue(makeSetting({ isActive: true }));
    repo.deactivatePrevious.mockResolvedValue({});

    await createSetting(validBody);

    // deactivatePrevious called with employeeId and new setting id
    expect(repo.deactivatePrevious).toHaveBeenCalledWith('e1', 's1');
  });

  test('should_not_deactivate_previous_when_new_setting_is_inactive', async () => {
    repo.create.mockResolvedValue(makeSetting({ isActive: false }));

    await createSetting({ ...validBody, isActive: false });

    expect(repo.deactivatePrevious).not.toHaveBeenCalled();
  });

  test('should_default_optional_allowances_to_zero_when_omitted', async () => {
    repo.create.mockResolvedValue(makeSetting());
    repo.deactivatePrevious.mockResolvedValue({});

    await createSetting({ employeeId: 'e1', baseSalary: 5000000, effectiveDate: '2025-01-01' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mealAllowancePerDay: 0,
        transportAllowance:  0,
        overtimeRatePerHour: 0,
      })
    );
  });

  test('should_default_bpjs_jht_employee_to_2_percent', async () => {
    repo.create.mockResolvedValue(makeSetting());
    repo.deactivatePrevious.mockResolvedValue({});

    await createSetting({ employeeId: 'e1', baseSalary: 5000000, effectiveDate: '2025-01-01' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ bpjsJhtPercent: 2 })
    );
  });
});

// ── updateSetting ─────────────────────────────────────────────────────────────

describe('updateSetting', () => {
  test('should_throw_404_when_setting_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(updateSetting('missing', { baseSalary: 6000000 })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_update_setting_when_found', async () => {
    repo.findById.mockResolvedValue(makeSetting());
    repo.update.mockResolvedValue(makeSetting({ baseSalary: 6000000 }));

    const result = await updateSetting('s1', { baseSalary: 6000000 });

    expect(repo.update).toHaveBeenCalledWith('s1', expect.objectContaining({ baseSalary: 6000000 }));
  });

  test('should_deactivate_others_when_activating_a_setting', async () => {
    const existing = makeSetting({ isActive: false, employeeId: 'e1' });
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue({ ...existing, isActive: true });
    repo.deactivatePrevious.mockResolvedValue({});

    await updateSetting('s1', { isActive: true });

    expect(repo.deactivatePrevious).toHaveBeenCalledWith('e1', 's1');
  });

  test('should_not_deactivate_others_when_not_activating', async () => {
    repo.findById.mockResolvedValue(makeSetting());
    repo.update.mockResolvedValue(makeSetting({ baseSalary: 6000000 }));

    await updateSetting('s1', { baseSalary: 6000000 });

    expect(repo.deactivatePrevious).not.toHaveBeenCalled();
  });

  test('should_convert_effectiveDate_string_to_Date_object', async () => {
    repo.findById.mockResolvedValue(makeSetting());
    repo.update.mockResolvedValue(makeSetting());

    await updateSetting('s1', { effectiveDate: '2025-06-01' });

    expect(repo.update).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ effectiveDate: expect.any(Date) })
    );
  });
});
