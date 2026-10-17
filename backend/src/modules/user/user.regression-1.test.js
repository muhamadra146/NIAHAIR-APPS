'use strict';

// Regression: QA G3 (2026-10-15)
//   G3-10 — email login beda huruf besar/kecil → akun ganda & tidak bisa reset password
//   G3-25 — akun user bisa dibuat dengan role user yang nonaktif

jest.mock('../../config/prisma', () => ({}));
jest.mock('./user.repository');
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hash') }));

const { safeParse } = require('valibot');
const repo = require('./user.repository');
const svc  = require('./user.service');
const { createUserSchema, updateUserSchema } = require('./user.validation');

const INPUT = { username: 'nia', email: 'Nia@Salon.COM', password: 'secret1', userRoleId: 'r1', employeeId: 'e1' };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findByUsername.mockResolvedValue(null);
  repo.findByEmail.mockResolvedValue(null);
  repo.findUserRoleById.mockResolvedValue({ id: 'r1', code: 'CASHIER', isActive: true });
  repo.findEmployeeById.mockResolvedValue({ id: 'e1' });
  repo.findByEmployeeId.mockResolvedValue(null);
  repo.findEmployeeByEmail.mockResolvedValue(null);
  repo.create.mockResolvedValue({ id: 'u1' });
  repo.findById.mockResolvedValue({ id: 'u1', email: 'nia@salon.com', employeeId: 'e1', role: { id: 'r1' } });
  repo.update.mockResolvedValue({ id: 'u1' });
});

describe('G3-10', () => {
  test('validasi: email dinormalkan', () => {
    expect(safeParse(createUserSchema, { ...INPUT, email: ' A@B.COM ' }).output.email).toBe('a@b.com');
    expect(safeParse(updateUserSchema, { email: 'A@B.Com' }).output.email).toBe('a@b.com');
  });

  test('buat user: email disimpan huruf kecil', async () => {
    await svc.createUser(INPUT);
    expect(repo.findByEmail).toHaveBeenCalledWith('nia@salon.com');
    expect(repo.create.mock.calls[0][0].email).toBe('nia@salon.com');
  });

  test('email yang sama beda huruf sudah dipakai → 409', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'u9' });
    await expect(svc.createUser(INPUT)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('G3-25 role user nonaktif', () => {
  test('buat user dengan role nonaktif → 422', async () => {
    repo.findUserRoleById.mockResolvedValue({ id: 'r1', code: 'CASHIER', isActive: false });
    await expect(svc.createUser(INPUT)).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('ganti ke role nonaktif → 422', async () => {
    repo.findUserRoleById.mockResolvedValue({ id: 'r2', isActive: false });
    await expect(svc.updateUser('u1', { roleId: 'r2' })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('role saat ini (walau nonaktif) tetap boleh dikirim ulang', async () => {
    repo.findUserRoleById.mockResolvedValue({ id: 'r1', isActive: false });
    await expect(svc.updateUser('u1', { roleId: 'r1' })).resolves.toBeDefined();
  });
});
