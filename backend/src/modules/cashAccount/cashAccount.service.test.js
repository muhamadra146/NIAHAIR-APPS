'use strict';

jest.mock('./cashAccount.repository');

const repo = require('./cashAccount.repository');
const svc  = require('./cashAccount.service');

const ACCOUNT = { id: 'ca1', code: 'CASH', name: 'Kas Utama', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── listCashAccounts ───────────────────────────────────────────────────

describe('listCashAccounts', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([ACCOUNT]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listCashAccounts({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getCashAccountById ─────────────────────────────────────────────────

describe('getCashAccountById', () => {
  test('returns account when found', async () => {
    repo.findById.mockResolvedValue(ACCOUNT);
    await expect(svc.getCashAccountById('ca1')).resolves.toEqual(ACCOUNT);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getCashAccountById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createCashAccount ──────────────────────────────────────────────────

describe('createCashAccount', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(ACCOUNT);
    await expect(svc.createCashAccount({ code: 'cash', name: 'Kas' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates account with uppercase code', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(ACCOUNT);

    await svc.createCashAccount({ code: 'cash', name: 'Kas Utama' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'CASH' }));
  });
});

// ── updateCashAccount ──────────────────────────────────────────────────

describe('updateCashAccount', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateCashAccount('x', { name: 'Test' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when no updatable fields provided', async () => {
    repo.findById.mockResolvedValue(ACCOUNT);
    await expect(svc.updateCashAccount('ca1', {})).rejects.toMatchObject({ statusCode: 422 });
  });

  test('updates allowed fields', async () => {
    repo.findById.mockResolvedValue(ACCOUNT);
    repo.update.mockResolvedValue({ ...ACCOUNT, name: 'Updated' });

    const result = await svc.updateCashAccount('ca1', { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('ca1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

// ── deleteCashAccount ──────────────────────────────────────────────────

describe('deleteCashAccount', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteCashAccount('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('soft-deactivates account on delete', async () => {
    repo.findById.mockResolvedValue(ACCOUNT);
    repo.update.mockResolvedValue({ ...ACCOUNT, isActive: false });

    const result = await svc.deleteCashAccount('ca1');
    expect(repo.update).toHaveBeenCalledWith('ca1', { isActive: false });
    expect(result.isActive).toBe(false);
  });
});
