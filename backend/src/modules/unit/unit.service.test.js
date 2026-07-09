'use strict';

jest.mock('./unit.repository');

const repo = require('./unit.repository');
const svc  = require('./unit.service');

const UNIT = { id: 'u1', name: 'Botol', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([UNIT]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns unit when found', async () => {
    repo.findById.mockResolvedValue(UNIT);
    await expect(svc.getById('u1')).resolves.toEqual(UNIT);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});
