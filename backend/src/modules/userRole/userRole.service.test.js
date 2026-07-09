'use strict';

jest.mock('./userRole.repository');

const repo = require('./userRole.repository');
const svc  = require('./userRole.service');

const ROLE = { id: 'r1', code: 'CASHIER', name: 'Kasir', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([ROLE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns role when found', async () => {
    repo.findById.mockResolvedValue(ROLE);
    await expect(svc.getById('r1')).resolves.toEqual(ROLE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createUserRole ─────────────────────────────────────────────────────

describe('createUserRole', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(ROLE);
    await expect(svc.createUserRole({ code: 'cashier', name: 'Kasir' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates role with uppercase code', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(ROLE);

    await svc.createUserRole({ code: 'cashier', name: 'Kasir' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'CASHIER', isActive: true }));
  });
});

// ── updateUserRole ─────────────────────────────────────────────────────

describe('updateUserRole', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateUserRole('x', { name: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('strips code from update body (code is immutable)', async () => {
    repo.findById.mockResolvedValue(ROLE);
    repo.update.mockResolvedValue({ ...ROLE, name: 'Updated' });

    await svc.updateUserRole('r1', { code: 'HACKED', name: 'Updated' });
    const callArg = repo.update.mock.calls[0][1];
    expect(callArg).not.toHaveProperty('code');
    expect(callArg).toMatchObject({ name: 'Updated' });
  });
});

// ── deactivateUserRole ─────────────────────────────────────────────────

describe('deactivateUserRole', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deactivateUserRole('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when role is already inactive', async () => {
    repo.findById.mockResolvedValue({ ...ROLE, isActive: false });
    await expect(svc.deactivateUserRole('r1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('deactivates active role', async () => {
    repo.findById.mockResolvedValue(ROLE);
    repo.deactivate.mockResolvedValue({ ...ROLE, isActive: false });

    const result = await svc.deactivateUserRole('r1');
    expect(repo.deactivate).toHaveBeenCalledWith('r1');
    expect(result.isActive).toBe(false);
  });
});
