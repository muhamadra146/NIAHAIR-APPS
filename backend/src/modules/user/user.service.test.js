'use strict';

jest.mock('./user.repository');
jest.mock('bcryptjs');

const repo   = require('./user.repository');
const bcrypt = require('bcryptjs');
const svc    = require('./user.service');

const USER = {
  id: 'u1', email: 'admin@salon.com', isActive: true,
  employeeId: 'e1', passwordHash: 'hashed',
};

beforeEach(() => {
  jest.clearAllMocks();
  bcrypt.hash.mockResolvedValue('newhash');
  bcrypt.compare.mockResolvedValue(true);
});

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([USER]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('SUPER_ADMIN can fetch any user', async () => {
    repo.findById.mockResolvedValue(USER);
    await expect(svc.getById('u1', 'other', 'SUPER_ADMIN')).resolves.toEqual(USER);
  });

  test('user can fetch their own profile', async () => {
    repo.findById.mockResolvedValue(USER);
    await expect(svc.getById('u1', 'u1', 'STAFF')).resolves.toEqual(USER);
  });

  test('throws 403 when non-admin fetches another user', async () => {
    await expect(svc.getById('u1', 'other', 'CASHIER')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 404 when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('u1', 'u1', 'SUPER_ADMIN')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createUser ─────────────────────────────────────────────────────────

describe('createUser', () => {
  beforeEach(() => {
    repo.findByEmail.mockResolvedValue(null);
    repo.findUserRoleById.mockResolvedValue({ id: 'r1', code: 'STAFF' });
    repo.findEmployeeById.mockResolvedValue({ id: 'e1' });
    repo.findByEmployeeId.mockResolvedValue(null);
    repo.create.mockResolvedValue(USER);
  });

  test('throws 409 when email already exists', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'other' });
    await expect(svc.createUser({ email: 'admin@salon.com', password: 'pw', userRoleId: 'r1', employeeId: 'e1' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 404 when userRole not found', async () => {
    repo.findUserRoleById.mockResolvedValue(null);
    await expect(svc.createUser({ email: 'new@salon.com', password: 'pw', userRoleId: 'bad', employeeId: 'e1' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when employee not found', async () => {
    repo.findEmployeeById.mockResolvedValue(null);
    await expect(svc.createUser({ email: 'new@salon.com', password: 'pw', userRoleId: 'r1', employeeId: 'bad' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when employee already has a user account', async () => {
    repo.findByEmployeeId.mockResolvedValue({ id: 'existing' });
    await expect(svc.createUser({ email: 'new@salon.com', password: 'pw', userRoleId: 'r1', employeeId: 'e1' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('hashes password before create', async () => {
    await svc.createUser({ email: 'new@salon.com', password: 'pw', userRoleId: 'r1', employeeId: 'e1' });
    expect(bcrypt.hash).toHaveBeenCalledWith('pw', 10);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'newhash' }));
  });
});

// ── updateUser ─────────────────────────────────────────────────────────

describe('updateUser', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(USER);
    repo.findUserRoleById.mockResolvedValue({ id: 'r2' });
    repo.findEmployeeById.mockResolvedValue({ id: 'e2' });
    repo.findByEmployeeId.mockResolvedValue(null);
    repo.update.mockResolvedValue(USER);
  });

  test('throws 404 when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateUser('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when new roleId not found', async () => {
    repo.findUserRoleById.mockResolvedValue(null);
    await expect(svc.updateUser('u1', { roleId: 'bad' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when new employeeId not found', async () => {
    repo.findEmployeeById.mockResolvedValue(null);
    await expect(svc.updateUser('u1', { employeeId: 'bad' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when new employeeId already taken', async () => {
    repo.findByEmployeeId.mockResolvedValue({ id: 'other' });
    await expect(svc.updateUser('u1', { employeeId: 'e99' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips employee check when employeeId unchanged', async () => {
    await svc.updateUser('u1', { employeeId: USER.employeeId });
    expect(repo.findEmployeeById).not.toHaveBeenCalled();
  });

  test('allows setting employeeId to null', async () => {
    await svc.updateUser('u1', { employeeId: null });
    expect(repo.findEmployeeById).not.toHaveBeenCalled();
  });
});

// ── resetPassword ──────────────────────────────────────────────────────

describe('resetPassword', () => {
  test('throws 404 when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.resetPassword('x', { password: 'new' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('hashes and updates password on success', async () => {
    repo.findById.mockResolvedValue(USER);
    repo.updatePassword.mockResolvedValue({ id: 'u1' });

    const result = await svc.resetPassword('u1', { password: 'newpw' });
    expect(bcrypt.hash).toHaveBeenCalledWith('newpw', 10);
    expect(repo.updatePassword).toHaveBeenCalledWith('u1', 'newhash');
    expect(result.message).toBe('Password updated');
  });
});

// ── changeOwnPassword ──────────────────────────────────────────────────

describe('changeOwnPassword', () => {
  test('throws 404 when user not found', async () => {
    repo.findByIdWithPassword.mockResolvedValue(null);
    await expect(svc.changeOwnPassword('u1', { currentPassword: 'old', newPassword: 'new' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 401 when current password wrong', async () => {
    repo.findByIdWithPassword.mockResolvedValue(USER);
    bcrypt.compare.mockResolvedValue(false);
    await expect(svc.changeOwnPassword('u1', { currentPassword: 'wrong', newPassword: 'new' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test('updates password when current is correct', async () => {
    repo.findByIdWithPassword.mockResolvedValue(USER);
    repo.updatePassword.mockResolvedValue({ id: 'u1' });

    const result = await svc.changeOwnPassword('u1', { currentPassword: 'old', newPassword: 'newpw' });
    expect(repo.updatePassword).toHaveBeenCalledWith('u1', 'newhash');
    expect(result.message).toBeDefined();
  });
});

// ── deactivateUser ─────────────────────────────────────────────────────

describe('deactivateUser', () => {
  test('throws 404 when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deactivateUser('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when user already inactive', async () => {
    repo.findById.mockResolvedValue({ ...USER, isActive: false });
    await expect(svc.deactivateUser('u1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('deactivates active user', async () => {
    repo.findById.mockResolvedValue(USER);
    repo.deactivate.mockResolvedValue({ ...USER, isActive: false });

    const result = await svc.deactivateUser('u1');
    expect(repo.deactivate).toHaveBeenCalledWith('u1');
    expect(result.isActive).toBe(false);
  });
});
