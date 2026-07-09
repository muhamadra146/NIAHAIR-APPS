'use strict';

jest.mock('./auth.repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const repo   = require('./auth.repository');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const svc    = require('./auth.service');

const EMPLOYEE_BRANCHES = [{ branch: { id: 'b1', name: 'Jakarta' } }];

const USER_STAFF = {
  id: 'u1', email: 'staff@salon.com', isActive: true,
  passwordHash: 'hashed', employeeId: 'e1',
  role:     { code: 'STAFF', id: 'r1', name: 'Staff' },
  employee: { id: 'e1', name: 'Nia', employeeBranches: EMPLOYEE_BRANCHES },
};

const USER_SUPER_ADMIN = {
  ...USER_STAFF, id: 'u2', email: 'admin@salon.com',
  role: { code: 'SUPER_ADMIN', id: 'r0', name: 'Super Admin' },
};

const ALL_BRANCHES = [{ id: 'b1', name: 'Jakarta' }, { id: 'b2', name: 'Surabaya' }];

beforeEach(() => {
  jest.clearAllMocks();
  jwt.sign.mockReturnValue('mock.jwt.token');
  bcrypt.compare.mockResolvedValue(true);
});

// ── login ──────────────────────────────────────────────────────────────

describe('login', () => {
  test('throws 401 when user not found', async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    await expect(svc.login({ email: 'x@x.com', password: 'pw' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test('throws 401 when user is inactive', async () => {
    repo.findUserByEmail.mockResolvedValue({ ...USER_STAFF, isActive: false });
    await expect(svc.login({ email: 'staff@salon.com', password: 'pw' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test('throws 401 when password is wrong', async () => {
    repo.findUserByEmail.mockResolvedValue(USER_STAFF);
    bcrypt.compare.mockResolvedValue(false);
    await expect(svc.login({ email: 'staff@salon.com', password: 'wrong' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test('returns token + user with employee branches for non-admin', async () => {
    repo.findUserByEmail.mockResolvedValue(USER_STAFF);

    const result = await svc.login({ email: 'staff@salon.com', password: 'pw' });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', roleCode: 'STAFF' }),
      expect.anything(),
      expect.anything()
    );
    expect(result.token).toBe('mock.jwt.token');
    expect(result.user.branches).toHaveLength(1);
    expect(repo.findAllBranches).not.toHaveBeenCalled();
  });

  test('fetches all branches for SUPER_ADMIN', async () => {
    repo.findUserByEmail.mockResolvedValue(USER_SUPER_ADMIN);
    repo.findAllBranches.mockResolvedValue(ALL_BRANCHES);

    const result = await svc.login({ email: 'admin@salon.com', password: 'pw' });
    expect(repo.findAllBranches).toHaveBeenCalled();
    expect(result.user.branches).toHaveLength(2);
  });

  test('returns empty branches array when employee has no branches', async () => {
    repo.findUserByEmail.mockResolvedValue({
      ...USER_STAFF, employee: { id: 'e1', name: 'Nia', employeeBranches: [] },
    });

    const result = await svc.login({ email: 'staff@salon.com', password: 'pw' });
    expect(result.user.branches).toHaveLength(0);
  });
});

// ── getMe ──────────────────────────────────────────────────────────────

describe('getMe', () => {
  test('throws 404 when user not found', async () => {
    repo.findUserById.mockResolvedValue(null);
    await expect(svc.getMe('u999')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when user is inactive', async () => {
    repo.findUserById.mockResolvedValue({ ...USER_STAFF, isActive: false });
    await expect(svc.getMe('u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns user profile with employee branches for non-admin', async () => {
    repo.findUserById.mockResolvedValue(USER_STAFF);

    const result = await svc.getMe('u1');
    expect(result.id).toBe('u1');
    expect(result.roleCode).toBe('STAFF');
    expect(result.branches).toHaveLength(1);
  });

  test('fetches all branches for SUPER_ADMIN', async () => {
    repo.findUserById.mockResolvedValue(USER_SUPER_ADMIN);
    repo.findAllBranches.mockResolvedValue(ALL_BRANCHES);

    const result = await svc.getMe('u2');
    expect(repo.findAllBranches).toHaveBeenCalled();
    expect(result.branches).toHaveLength(2);
  });
});
