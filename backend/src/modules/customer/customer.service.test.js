'use strict';

/**
 * Unit tests — customer.service.js
 * Business Rules: CRM-001 (duplicate), CRM-002 (auto customerNo), CRM-005 (phone), CRM-017 (search)
 * Pattern: AAA — Arrange / Act / Assert
 * Mock: repository + syncQueue only. paginate/AppError are real.
 */

jest.mock('./customer.repository', () => ({
  findAll:           jest.fn(),
  count:             jest.fn(),
  findById:          jest.fn(),
  findByCustomerNo:  jest.fn(),
  findByPhone:       jest.fn(),
  findByEmail:       jest.fn(),
  findMaxCustomerNo: jest.fn(),
  create:            jest.fn(),
  update:            jest.fn(),
}));

jest.mock('../syncQueue/syncQueue.service', () => ({
  createSyncJob: jest.fn().mockResolvedValue({}),
}));

const repo         = require('./customer.repository');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const { getAll, getById, createCustomer, updateCustomer } = require('./customer.service');
const AppError     = require('../../common/errors/AppError');

beforeEach(() => jest.clearAllMocks());

// ── getById ───────────────────────────────────────────────────────────────

describe('getById', () => {
  test('should_return_customer_when_found', async () => {
    // Arrange
    const mockCustomer = { id: 'c1', name: 'Nia', customerNo: 'CUS-000001' };
    repo.findById.mockResolvedValue(mockCustomer);

    // Act
    const result = await getById('c1');

    // Assert
    expect(result).toEqual(mockCustomer);
    expect(repo.findById).toHaveBeenCalledWith('c1');
  });

  test('should_throw_not_found_when_customer_missing', async () => {
    // Arrange
    repo.findById.mockResolvedValue(null);

    // Act + Assert
    await expect(getById('missing')).rejects.toThrow(AppError);
    await expect(getById('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createCustomer ────────────────────────────────────────────────────────

describe('createCustomer — CRM-001, CRM-002, CRM-005', () => {
  const validBody = {
    name:        'Nia Hair',
    mobilePhone: '081234567890',
    email:       'nia@example.com',
  };

  beforeEach(() => {
    repo.findByPhone.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.findMaxCustomerNo.mockResolvedValue(0);
    repo.create.mockResolvedValue({ id: 'c1', ...validBody, customerNo: 'CUS-000001' });
  });

  test('should_create_customer_with_auto_customerNo_when_data_valid', async () => {
    // Arrange — defaults from beforeEach (max = 0 → CUS-000001)

    // Act
    const result = await createCustomer({ ...validBody });

    // Assert
    expect(result.customer.customerNo).toBe('CUS-000001');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ customerNo: 'CUS-000001' })
    );
  });

  test('should_increment_customerNo_from_max_sequence — CRM-002', async () => {
    // Arrange
    repo.findMaxCustomerNo.mockResolvedValue(5);
    repo.create.mockResolvedValue({ id: 'c2', customerNo: 'CUS-000006' });

    // Act
    const result = await createCustomer({ ...validBody });

    // Assert
    expect(result.customer.customerNo).toBe('CUS-000006');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ customerNo: 'CUS-000006' })
    );
  });

  test('should_throw_conflict_when_phone_already_exists — CRM-001', async () => {
    // Arrange
    repo.findByPhone.mockResolvedValue({ id: 'c99', name: 'Other', customerNo: 'CUS-000099' });

    // Act + Assert
    await expect(createCustomer({ ...validBody })).rejects.toThrow(AppError);
    await expect(createCustomer({ ...validBody })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('should_throw_conflict_when_email_already_exists — CRM-001', async () => {
    // Arrange
    repo.findByEmail.mockResolvedValue({ id: 'c99', name: 'Other', customerNo: 'CUS-000099' });

    // Act + Assert
    await expect(createCustomer({ ...validBody })).rejects.toThrow(AppError);
    await expect(createCustomer({ ...validBody })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('should_override_manual_customerNo_with_auto_generated — CRM-002', async () => {
    // Arrange — body contains customerNo that user tried to set manually
    const body = { ...validBody, customerNo: 'CUS-MANUAL' };

    // Act
    await createCustomer(body);

    // Assert — auto-generated number wins; manual input is ignored
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ customerNo: 'CUS-000001' })
    );
    expect(repo.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ customerNo: 'CUS-MANUAL' })
    );
  });

  test('should_queue_accurate_sync_after_create', async () => {
    // Act
    await createCustomer({ ...validBody });

    // Assert
    expect(createSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'CUSTOMER',
        direction:  'APP_TO_ACCURATE',
      })
    );
  });

  test('should_not_check_phone_uniqueness_when_phone_is_absent', async () => {
    // Arrange — no mobilePhone in body
    const body = { name: 'Nia', email: 'nia2@example.com' };
    repo.create.mockResolvedValue({ id: 'c3', customerNo: 'CUS-000001', ...body });

    // Act
    await createCustomer(body);

    // Assert
    expect(repo.findByPhone).not.toHaveBeenCalled();
  });
});

// ── updateCustomer ────────────────────────────────────────────────────────

describe('updateCustomer — CRM-001, CRM-002, CRM-005', () => {
  const existing = {
    id:          'c1',
    name:        'Nia',
    mobilePhone: '081234567890',
    email:       'nia@example.com',
    customerNo:  'CUS-000001',
  };

  beforeEach(() => {
    repo.findById.mockResolvedValue(existing);
    repo.findByPhone.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.update.mockResolvedValue({ ...existing, name: 'Nia Updated' });
  });

  test('should_update_customer_when_data_is_valid', async () => {
    // Act
    const result = await updateCustomer('c1', { name: 'Nia Updated' });

    // Assert
    expect(result.name).toBe('Nia Updated');
    expect(repo.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'Nia Updated' })
    );
  });

  test('should_throw_not_found_when_customer_missing', async () => {
    // Arrange
    repo.findById.mockResolvedValue(null);

    // Act + Assert
    await expect(updateCustomer('missing', { name: 'X' })).rejects.toThrow(AppError);
    await expect(updateCustomer('missing', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('should_throw_conflict_when_new_phone_taken_by_other — CRM-005', async () => {
    // Arrange
    repo.findByPhone.mockResolvedValue({ id: 'c99', name: 'Other' });

    // Act + Assert
    await expect(updateCustomer('c1', { mobilePhone: '089999999999' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('should_skip_phone_uniqueness_check_when_phone_unchanged — CRM-005', async () => {
    // Act — same phone as existing
    await updateCustomer('c1', { mobilePhone: existing.mobilePhone });

    // Assert — no phone lookup needed
    expect(repo.findByPhone).not.toHaveBeenCalled();
  });

  test('should_throw_conflict_when_new_email_taken_by_other — CRM-001', async () => {
    // Arrange
    repo.findByEmail.mockResolvedValue({ id: 'c99', name: 'Other' });

    // Act + Assert
    await expect(updateCustomer('c1', { email: 'other@example.com' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('should_skip_email_uniqueness_check_when_email_unchanged — CRM-001', async () => {
    // Act — same email as existing
    await updateCustomer('c1', { email: existing.email });

    // Assert
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  test('should_strip_customerNo_from_update_body — CRM-002', async () => {
    // Arrange — attacker tries to change customerNo
    const body = { name: 'Hacked', customerNo: 'CUS-HACK' };

    // Act
    await updateCustomer('c1', body);

    // Assert — customerNo must NOT appear in the update call
    expect(repo.update).toHaveBeenCalledWith(
      'c1',
      expect.not.objectContaining({ customerNo: 'CUS-HACK' })
    );
  });
});

// ── getAll — CRM-017 ──────────────────────────────────────────────────────

describe('getAll — search includes customerNo — CRM-017', () => {
  beforeEach(() => {
    repo.findAll.mockResolvedValue([]);
    repo.count.mockResolvedValue(0);
  });

  test('should_include_customerNo_in_search_OR_clause', async () => {
    // Act
    await getAll({ page: 1, limit: 10, search: 'CUS-000001' });

    // Assert — OR clause must contain customerNo filter
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ customerNo: expect.anything() }),
          ]),
        }),
      })
    );
  });

  test('should_not_add_OR_clause_when_search_is_empty', async () => {
    // Act
    await getAll({ page: 1, limit: 10 });

    // Assert — no search filter when search omitted
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ OR: expect.anything() }) })
    );
  });

  test('should_return_pagination_meta', async () => {
    // Arrange
    repo.count.mockResolvedValue(25);
    repo.findAll.mockResolvedValue([{ id: 'c1' }]);

    // Act
    const result = await getAll({ page: 1, limit: 10 });

    // Assert
    expect(result.meta).toBeDefined();
    expect(result.meta.total).toBe(25);
    expect(result.data).toHaveLength(1);
  });

  test('should_filter_by_isActive_when_provided', async () => {
    // Act
    await getAll({ page: 1, limit: 10, isActive: 'true' });

    // Assert
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });
});
