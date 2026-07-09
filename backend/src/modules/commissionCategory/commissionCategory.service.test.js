'use strict';

jest.mock('./commissionCategory.repository');

const repo = require('./commissionCategory.repository');
const svc  = require('./commissionCategory.service');

const CATEGORY = { id: 'cc1', code: 'HAIR', name: 'Hair Service', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([CATEGORY]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns category when found', async () => {
    repo.findById.mockResolvedValue(CATEGORY);
    await expect(svc.getById('cc1')).resolves.toEqual(CATEGORY);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createCommissionCategory ───────────────────────────────────────────

describe('createCommissionCategory', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(CATEGORY);
    await expect(svc.createCommissionCategory({ code: 'HAIR', name: 'Hair' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates category when code is unique', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(CATEGORY);

    const result = await svc.createCommissionCategory({ code: 'HAIR', name: 'Hair Service' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'HAIR', isActive: true }));
    expect(result).toEqual(CATEGORY);
  });
});

// ── updateCommissionCategory ───────────────────────────────────────────

describe('updateCommissionCategory', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(CATEGORY);
    repo.findByCode.mockResolvedValue(null);
    repo.update.mockResolvedValue({ ...CATEGORY, name: 'Updated' });
  });

  test('throws 404 when category not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateCommissionCategory('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when new code already taken', async () => {
    repo.findByCode.mockResolvedValue({ id: 'cc_other' });
    await expect(svc.updateCommissionCategory('cc1', { code: 'TAKEN' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips code check when code unchanged', async () => {
    await svc.updateCommissionCategory('cc1', { code: 'HAIR', name: 'Updated' });
    expect(repo.findByCode).not.toHaveBeenCalled();
  });

  test('updates category successfully', async () => {
    const result = await svc.updateCommissionCategory('cc1', { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('cc1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

// ── deleteCommissionCategory ───────────────────────────────────────────

describe('deleteCommissionCategory', () => {
  test('throws 404 when category not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteCommissionCategory('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when category has commission rules', async () => {
    repo.findById.mockResolvedValue(CATEGORY);
    repo.countRulesByCategory.mockResolvedValue(3);
    await expect(svc.deleteCommissionCategory('cc1')).rejects.toMatchObject({ statusCode: 409 });
  });

  test('deletes category when no rules attached', async () => {
    repo.findById.mockResolvedValue(CATEGORY);
    repo.countRulesByCategory.mockResolvedValue(0);
    repo.deleteById.mockResolvedValue(undefined);

    await svc.deleteCommissionCategory('cc1');
    expect(repo.deleteById).toHaveBeenCalledWith('cc1');
  });
});
