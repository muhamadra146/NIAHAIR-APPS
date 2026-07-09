'use strict';

jest.mock('./branch.repository');

const repo = require('./branch.repository');
const svc  = require('./branch.service');

const BRANCH = { id: 'b1', code: 'JKT', name: 'Jakarta', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([BRANCH]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns branch when found', async () => {
    repo.findById.mockResolvedValue(BRANCH);
    await expect(svc.getById('b1')).resolves.toEqual(BRANCH);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createBranch ───────────────────────────────────────────────────────

describe('createBranch', () => {
  test('throws 409 when branch code already exists', async () => {
    repo.findByCode.mockResolvedValue(BRANCH);
    await expect(svc.createBranch({ code: 'JKT', name: 'Jakarta Dupe' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates branch when code is unique', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(BRANCH);

    const result = await svc.createBranch({ code: 'JKT', name: 'Jakarta' });
    expect(repo.create).toHaveBeenCalled();
    expect(result).toEqual(BRANCH);
  });
});

// ── updateBranch ───────────────────────────────────────────────────────

describe('updateBranch', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(BRANCH);
    repo.findByCode.mockResolvedValue(null);
    repo.update.mockResolvedValue({ ...BRANCH, name: 'Updated' });
  });

  test('throws 404 when branch not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateBranch('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when new code already taken', async () => {
    repo.findByCode.mockResolvedValue({ id: 'other' });
    await expect(svc.updateBranch('b1', { code: 'TAKEN' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips code check when code unchanged', async () => {
    await svc.updateBranch('b1', { code: BRANCH.code, name: 'Updated' });
    expect(repo.findByCode).not.toHaveBeenCalled();
  });

  test('updates branch successfully', async () => {
    const result = await svc.updateBranch('b1', { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('b1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

// ── deleteBranch ───────────────────────────────────────────────────────

describe('deleteBranch', () => {
  test('throws 404 when branch not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteBranch('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when branch has active employees', async () => {
    repo.findById.mockResolvedValue(BRANCH);
    repo.countActiveEmployees.mockResolvedValue(3);
    await expect(svc.deleteBranch('b1')).rejects.toMatchObject({ statusCode: 409 });
  });

  test('soft deletes branch when no active employees', async () => {
    repo.findById.mockResolvedValue(BRANCH);
    repo.countActiveEmployees.mockResolvedValue(0);
    repo.softDelete.mockResolvedValue({ ...BRANCH, isActive: false });

    const result = await svc.deleteBranch('b1');
    expect(repo.softDelete).toHaveBeenCalledWith('b1');
    expect(result.isActive).toBe(false);
  });
});
