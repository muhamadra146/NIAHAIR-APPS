'use strict';

/**
 * Unit tests — commissionRule.service.js
 * Business Rules: commission rule duplicate guard, PERCENTAGE cap, FK validation
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: repository only. AppError/paginate are real.
 */

jest.mock('./commissionRule.repository', () => ({
  findAll:                    jest.fn(),
  count:                      jest.fn(),
  findById:                   jest.fn(),
  findActiveByEmployeeAndCategory: jest.fn(),
  findDuplicate:              jest.fn(),
  findEmployeeById:           jest.fn(),
  findCommissionCategoryById: jest.fn(),
  create:                     jest.fn(),
  update:                     jest.fn(),
  deleteById:                 jest.fn(),
}));

const repo = require('./commissionRule.repository');
const { getById, createCommissionRule, updateCommissionRule, deleteCommissionRule } =
  require('./commissionRule.service');
const AppError = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

// ── getById ───────────────────────────────────────────────────────────────────

describe('getById', () => {
  test('should_return_rule_when_found', async () => {
    const mockRule = { id: 'r1', employeeId: 'e1', commissionCategoryId: 'cc1', commissionType: 'PERCENTAGE', commissionValue: 10 };
    repo.findById.mockResolvedValue(mockRule);

    const result = await getById('r1');

    expect(result).toEqual(mockRule);
    expect(repo.findById).toHaveBeenCalledWith('r1');
  });

  test('should_throw_404_when_rule_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(getById('missing')).rejects.toThrow(AppError);
    await expect(getById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createCommissionRule ──────────────────────────────────────────────────────

describe('createCommissionRule', () => {
  const validBody = {
    employeeId:           'e1',
    commissionCategoryId: 'cc1',
    commissionType:       'PERCENTAGE',
    commissionValue:      10,
    effectiveDate:        '2025-01-01',
    slotKey:              'pemasang',
  };

  beforeEach(() => {
    repo.findEmployeeById.mockResolvedValue({ id: 'e1', name: 'Nia' });
    repo.findCommissionCategoryById.mockResolvedValue({ id: 'cc1', name: 'COLOR' });
    repo.findDuplicate.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 'r1', ...validBody });
  });

  test('should_create_rule_when_data_valid', async () => {
    const result = await createCommissionRule(validBody);

    expect(result.id).toBe('r1');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('should_throw_404_when_employee_not_found', async () => {
    repo.findEmployeeById.mockResolvedValue(null);

    await expect(createCommissionRule(validBody)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_404_when_category_not_found', async () => {
    repo.findCommissionCategoryById.mockResolvedValue(null);

    await expect(createCommissionRule(validBody)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_400_when_percentage_exceeds_100', async () => {
    const body = { ...validBody, commissionType: 'PERCENTAGE', commissionValue: 150 };

    await expect(createCommissionRule(body)).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('should_allow_flat_amount_greater_than_100', async () => {
    const body = { ...validBody, commissionType: 'FLAT', commissionValue: 50000 };
    repo.create.mockResolvedValue({ id: 'r2', ...body });

    await expect(createCommissionRule(body)).resolves.toBeDefined();
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('should_throw_409_when_duplicate_rule_exists', async () => {
    repo.findDuplicate.mockResolvedValue({ id: 'r-existing' });

    await expect(createCommissionRule(validBody)).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('should_use_null_slotKey_when_omitted', async () => {
    const body = { ...validBody };
    delete body.slotKey;

    await createCommissionRule(body);

    expect(repo.findDuplicate).toHaveBeenCalledWith('e1', 'cc1', null, '2025-01-01');
  });
});

// ── updateCommissionRule ──────────────────────────────────────────────────────

describe('updateCommissionRule', () => {
  const existingRule = {
    id:                   'r1',
    employeeId:           'e1',
    commissionCategoryId: 'cc1',
    commissionType:       'PERCENTAGE',
    commissionValue:      10,
  };

  beforeEach(() => {
    repo.findById.mockResolvedValue(existingRule);
    repo.findEmployeeById.mockResolvedValue({ id: 'e2', name: 'New' });
    repo.findCommissionCategoryById.mockResolvedValue({ id: 'cc2', name: 'KERATIN' });
    repo.update.mockResolvedValue({ ...existingRule, commissionValue: 15 });
  });

  test('should_throw_404_when_rule_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(updateCommissionRule('missing', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_404_when_new_employee_not_found', async () => {
    repo.findEmployeeById.mockResolvedValue(null);

    await expect(updateCommissionRule('r1', { employeeId: 'e-new' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_skip_employee_check_when_employee_unchanged', async () => {
    await updateCommissionRule('r1', { employeeId: 'e1' });

    expect(repo.findEmployeeById).not.toHaveBeenCalled();
  });

  test('should_throw_404_when_new_category_not_found', async () => {
    repo.findCommissionCategoryById.mockResolvedValue(null);

    await expect(updateCommissionRule('r1', { commissionCategoryId: 'cc-new' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_400_when_percentage_value_exceeds_100', async () => {
    // commissionType stays PERCENTAGE (from rule), new value is 150
    await expect(
      updateCommissionRule('r1', { commissionValue: 150 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('should_update_when_data_valid', async () => {
    const result = await updateCommissionRule('r1', { commissionValue: 15 });

    expect(result).toBeDefined();
    expect(repo.update).toHaveBeenCalledWith('r1', expect.objectContaining({ commissionValue: 15 }));
  });
});

// ── deleteCommissionRule ──────────────────────────────────────────────────────

describe('deleteCommissionRule', () => {
  test('should_delete_rule_when_found', async () => {
    repo.findById.mockResolvedValue({ id: 'r1' });
    repo.deleteById.mockResolvedValue({});

    await deleteCommissionRule('r1');

    expect(repo.deleteById).toHaveBeenCalledWith('r1');
  });

  test('should_throw_404_when_rule_not_found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(deleteCommissionRule('missing')).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.deleteById).not.toHaveBeenCalled();
  });
});
