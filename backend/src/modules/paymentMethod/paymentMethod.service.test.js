'use strict';

jest.mock('./paymentMethod.repository');

const repo = require('./paymentMethod.repository');
const svc  = require('./paymentMethod.service');

const PM = { id: 'pm1', code: 'CASH', name: 'Tunai', isActive: true, cashAccountId: null };

beforeEach(() => jest.clearAllMocks());

// ── listPaymentMethods ─────────────────────────────────────────────────

describe('listPaymentMethods', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([PM]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listPaymentMethods({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getPaymentMethodById ───────────────────────────────────────────────

describe('getPaymentMethodById', () => {
  test('returns payment method when found', async () => {
    repo.findById.mockResolvedValue(PM);
    await expect(svc.getPaymentMethodById('pm1')).resolves.toEqual(PM);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getPaymentMethodById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createPaymentMethod ────────────────────────────────────────────────

describe('createPaymentMethod', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(PM);
    await expect(svc.createPaymentMethod({ code: 'cash', name: 'Tunai' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates with uppercase code', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(PM);

    await svc.createPaymentMethod({ code: 'cash', name: 'Tunai' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'CASH' }));
  });
});

// ── updatePaymentMethod ────────────────────────────────────────────────

describe('updatePaymentMethod', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(PM);
    repo.findByCode.mockResolvedValue(null);
    repo.update.mockResolvedValue({ ...PM, name: 'Updated' });
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updatePaymentMethod('x', { name: 'Test' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when new code already taken by another PM', async () => {
    repo.findByCode.mockResolvedValue({ id: 'pm_other' });
    await expect(svc.updatePaymentMethod('pm1', { code: 'TAKEN' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 422 when no updatable fields provided', async () => {
    await expect(svc.updatePaymentMethod('pm1', {})).rejects.toMatchObject({ statusCode: 422 });
  });

  test('allows updating code to same value (same id)', async () => {
    repo.findByCode.mockResolvedValue(PM); // same id → allowed
    await svc.updatePaymentMethod('pm1', { code: 'CASH', name: 'Updated' });
    expect(repo.update).toHaveBeenCalled();
  });

  test('updates name successfully', async () => {
    const result = await svc.updatePaymentMethod('pm1', { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('pm1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

// ── deletePaymentMethod ────────────────────────────────────────────────

describe('deletePaymentMethod', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deletePaymentMethod('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('soft-deactivates (isActive=false) on delete', async () => {
    repo.findById.mockResolvedValue(PM);
    repo.update.mockResolvedValue({ ...PM, isActive: false });

    const result = await svc.deletePaymentMethod('pm1');
    expect(repo.update).toHaveBeenCalledWith('pm1', { isActive: false });
    expect(result.isActive).toBe(false);
  });
});
